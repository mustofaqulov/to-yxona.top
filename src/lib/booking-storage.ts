import { z } from 'zod';
import { Prisma, type Booking, type BookingStatus, type User } from '@prisma/client';
import { db } from './db';
import { isAdmin } from './auth';
import { HttpError } from './http';
import { ACTIVE_BOOKING_STATUSES, dayStart, isDateTaken } from './availability';
import { notify } from './notifications';
import { foodIds } from './food-menu';
import { isoDateSchema, todayIso } from './validation';

const BOOKING_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SERIALIZATION_RETRIES = 3;

// Shape consumed by the existing admin UI.
export type BookingRequest = {
  id: string;
  venueId: string;
  venueSlug: string;
  venueName: string;
  eventDate: string;
  guestCount: number;
  customerName: string;
  customerPhone: string;
  services: string[];
  food: string[];
  venuePrice: number;
  totalPrice: number;
  status: Lowercase<BookingStatus>;
  createdAt: string;
};

const bookingInclude = {
  weddingHall: { select: { id: true, slug: true, name: true, nameUz: true, totalPrice: true, capacity: true, ownerId: true } },
  services: { include: { service: { select: { name: true } } } },
} satisfies Prisma.BookingInclude;

type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function toBookingDto(booking: BookingRecord): BookingRequest {
  return {
    id: booking.id, venueId: booking.weddingHall.id, venueSlug: booking.weddingHall.slug,
    venueName: booking.weddingHall.nameUz || booking.weddingHall.name,
    eventDate: booking.date.toISOString().slice(0, 10), guestCount: booking.guestCount,
    customerName: booking.contactName, customerPhone: booking.contactPhone,
    services: booking.services.map(entry => entry.service.name), food: booking.food,
    venuePrice: booking.weddingHall.totalPrice, totalPrice: booking.totalPrice,
    status: booking.status.toLowerCase() as Lowercase<BookingStatus>, createdAt: booking.createdAt.toISOString(),
  };
}

/** Accepts "+998 90 123 45 67", "901234567" and similar; returns +998XXXXXXXXX or null. */
export function normalizeUzPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

const createSchema = z.object({
  venueSlug: z.string().trim().min(1).max(200),
  eventDate: isoDateSchema.refine(value => value >= todayIso(), 'Kelajakdagi to‘g‘ri sanani tanlang.'),
  guestCount: z.number().int().min(1),
  customerName: z.string().trim().min(2, 'Ism-familiyangizni kiriting.').max(100),
  customerPhone: z.string().trim().max(30).transform((value, ctx) => {
    const phone = normalizeUzPhone(value);
    if (!phone) ctx.addIssue({ code: 'custom', message: 'Telefon raqamini to‘g‘ri kiriting.' });
    return phone ?? '';
  }),
  services: z.array(z.string().max(60)).max(30).default([]),
  food: z.array(z.string().max(40)).max(30).default([]),
  specialRequests: z.string().trim().max(1000).optional(),
});

function uniqueOrThrow(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new HttpError(400, `${label} takrorlanmasligi kerak.`, 'VALIDATION_ERROR');
}

export async function expireStaleBookings() {
  const stale = await db.booking.findMany({ where: { status: 'PENDING', expiresAt: { lt: new Date() } }, select: { id: true, userId: true, weddingHall: { select: { name: true } } }, take: 200 });
  if (!stale.length) return;
  await db.$transaction([
    db.booking.updateMany({ where: { id: { in: stale.map(item => item.id) }, status: 'PENDING' }, data: { status: 'CANCELLED', cancelledAt: new Date() } }),
    ...stale.map(item => db.notification.create({ data: {
      userId: item.userId, type: 'BOOKING_EXPIRED', title: 'Buyurtma muddati tugadi', titleUz: 'Buyurtma muddati tugadi',
      message: `"${item.weddingHall.name}" bo‘yicha so‘rovingiz 24 soat ichida tasdiqlanmadi.`, messageUz: `"${item.weddingHall.name}" bo‘yicha so‘rovingiz 24 soat ichida tasdiqlanmadi.`,
      link: '/profile',
    } })),
  ]);
}

async function withSerializableRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try { return await run(); }
    catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!conflict || attempt >= MAX_SERIALIZATION_RETRIES) throw error;
    }
  }
}

export async function createBooking(input: unknown, user: User): Promise<BookingRequest> {
  const data = createSchema.parse(input);
  uniqueOrThrow(data.services, 'Xizmatlar');
  uniqueOrThrow(data.food, 'Taomlar');
  if (data.food.some(item => !foodIds.has(item))) throw new HttpError(400, 'Taomlarni ro‘yxatdan tanlang.', 'VALIDATION_ERROR');

  await expireStaleBookings();
  const hall = await db.weddingHall.findFirst({ where: { slug: data.venueSlug, isActive: true }, include: { services: { where: { isAvailable: true }, include: { service: true } } } });
  if (!hall) throw new HttpError(404, 'To‘yxona topilmadi.', 'NOT_FOUND');
  if (data.guestCount > hall.capacity) throw new HttpError(400, `Mehmonlar soni 1 dan ${hall.capacity} gacha bo‘lishi kerak.`, 'VALIDATION_ERROR');

  const chosen = data.services.map(name => hall.services.find(entry => entry.service.name === name));
  if (chosen.some(entry => !entry)) throw new HttpError(400, 'Xizmatlarni ro‘yxatdan tanlang.', 'VALIDATION_ERROR');
  if (data.food.length && !data.services.includes('Catering')) throw new HttpError(400, 'Taom tanlash uchun Katering xizmati kerak.', 'VALIDATION_ERROR');
  const servicesTotal = chosen.reduce((sum, entry) => sum + (entry?.price ?? 0), 0);
  const totalPrice = hall.totalPrice + servicesTotal;
  const date = dayStart(data.eventDate);

  const booking = await withSerializableRetry(() => db.$transaction(async tx => {
    if (await isDateTaken(tx, hall.id, date)) throw new HttpError(409, 'Bu sana band. Boshqa sanani tanlang.', 'DATE_TAKEN');
    const created = await tx.booking.create({
      data: {
        userId: user.id, weddingHallId: hall.id, date, guestCount: data.guestCount, budget: totalPrice, totalPrice,
        currency: hall.currency, expiresAt: new Date(Date.now() + BOOKING_TTL_MS), specialRequests: data.specialRequests,
        food: data.food, contactName: data.customerName, contactPhone: data.customerPhone,
        services: { create: chosen.map(entry => ({ serviceId: entry!.serviceId, price: entry!.price ?? 0 })) },
      },
      include: bookingInclude,
    });
    await notify({ userId: hall.ownerId, type: 'SYSTEM_UPDATE', title: 'Yangi buyurtma', message: `${data.customerName} ${data.eventDate} sanasiga "${hall.name}" ni bron qilmoqchi.`, link: '/admin' }, tx);
    return created;
  }, { isolationLevel: 'Serializable' }));
  return toBookingDto(booking);
}

export async function listBookings(user: User, status: BookingStatus | null, skip: number, take: number) {
  await expireStaleBookings();
  const scope: Prisma.BookingWhereInput = isAdmin(user) ? {}
    : user.role === 'WEDDING_HALL_OWNER' ? { weddingHall: { ownerId: user.id } } : { userId: user.id };
  const where: Prisma.BookingWhereInput = { ...scope, ...(status ? { status } : {}) };
  const [rows, total] = await Promise.all([
    db.booking.findMany({ where, include: bookingInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    db.booking.count({ where }),
  ]);
  return { bookings: rows.map(toBookingDto), total };
}

const OWNER_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
};
const CUSTOMER_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: ['CANCELLED'],
  CONFIRMED: ['CANCELLED'],
};

const STATUS_FIELD: Partial<Record<BookingStatus, keyof Booking>> = {
  CONFIRMED: 'confirmedAt', REJECTED: 'rejectedAt', COMPLETED: 'completedAt', CANCELLED: 'cancelledAt',
};

const STATUS_NOTICE: Partial<Record<BookingStatus, { type: 'BOOKING_ACCEPTED' | 'BOOKING_REJECTED' | 'BOOKING_CONFIRMED' | 'SYSTEM_UPDATE'; title: string }>> = {
  CONFIRMED: { type: 'BOOKING_CONFIRMED', title: 'Buyurtma tasdiqlandi' },
  REJECTED: { type: 'BOOKING_REJECTED', title: 'Buyurtma rad etildi' },
  COMPLETED: { type: 'SYSTEM_UPDATE', title: 'Tadbir yakunlandi' },
  CANCELLED: { type: 'SYSTEM_UPDATE', title: 'Buyurtma bekor qilindi' },
};

export async function changeBookingStatus(id: string, next: BookingStatus, actor: User): Promise<BookingRequest> {
  const booking = await db.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new HttpError(404, 'Buyurtma topilmadi.', 'NOT_FOUND');

  const isOwnerSide = isAdmin(actor) || booking.weddingHall.ownerId === actor.id;
  const isCustomerSide = booking.userId === actor.id;
  if (!isOwnerSide && !isCustomerSide) throw new HttpError(403, 'Ruxsat yo‘q.', 'FORBIDDEN');
  // Customers may only cancel; owner-side transitions take precedence for admins/owners.
  const allowed = (isOwnerSide ? OWNER_TRANSITIONS : CUSTOMER_TRANSITIONS)[booking.status] ?? [];
  if (!allowed.includes(next)) throw new HttpError(409, 'Bu holatga o‘tkazib bo‘lmaydi.', 'INVALID_TRANSITION');
  if (next === 'COMPLETED' && booking.date.toISOString().slice(0, 10) > todayIso()) throw new HttpError(409, 'Tadbir sanasi hali kelmagan.', 'INVALID_TRANSITION');

  const updated = await withSerializableRetry(() => db.$transaction(async tx => {
    const fresh = await tx.booking.findUnique({ where: { id }, select: { status: true } });
    if (fresh?.status !== booking.status) throw new HttpError(409, 'Buyurtma holati o‘zgargan. Sahifani yangilang.', 'STALE_STATE');
    if (next === 'CONFIRMED' && await isDateTaken(tx, booking.weddingHallId, booking.date, booking.id)) throw new HttpError(409, 'Bu sana boshqa buyurtma bilan band.', 'DATE_TAKEN');
    const result = await tx.booking.update({
      where: { id },
      data: { status: next, [STATUS_FIELD[next] as string]: new Date(), ...(next === 'CONFIRMED' ? { expiresAt: null } : {}) },
      include: bookingInclude,
    });
    if (next === 'CONFIRMED') await tx.weddingHall.update({ where: { id: booking.weddingHallId }, data: { bookingCount: { increment: 1 } } });
    const notice = STATUS_NOTICE[next];
    const recipient = isOwnerSide && !isCustomerSide ? booking.userId : booking.weddingHall.ownerId;
    if (notice) await notify({ userId: recipient, type: notice.type, title: notice.title, message: `"${booking.weddingHall.name}" — ${booking.date.toISOString().slice(0, 10)}`, link: '/profile' }, tx);
    return result;
  }, { isolationLevel: 'Serializable' }));
  return toBookingDto(updated);
}

export { ACTIVE_BOOKING_STATUSES };
