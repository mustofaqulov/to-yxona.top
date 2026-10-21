import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { allVenues } from './venue-storage';
import { foodIds } from './food-menu';

const root = path.join(process.cwd(), '.data', 'bookings');
const bookingFile = /^[0-9a-f-]{36}\.json$/;

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
  status: 'pending';
  createdAt: string;
};

export class BookingInputError extends Error {}

function selectedValues(value: unknown, allowed: ReadonlySet<string>, label: string) {
  if (!Array.isArray(value) || value.length > allowed.size || value.some(item => typeof item !== 'string' || !allowed.has(item))) {
    throw new BookingInputError(`${label} ro‘yxatidan tanlang.`);
  }
  if (new Set(value).size !== value.length) throw new BookingInputError(`${label} takrorlanmasligi kerak.`);
  return value as string[];
}

export async function createBooking(input: unknown): Promise<BookingRequest> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BookingInputError('So‘rov ma’lumotlari noto‘g‘ri.');
  const data = input as Record<string, unknown>;
  const hall = typeof data.venueSlug === 'string' ? (await allVenues()).find(item => item.slug === data.venueSlug) : null;
  if (!hall) throw new BookingInputError('To‘yxona topilmadi.');

  const eventDate = data.eventDate;
  const today = new Date().toISOString().slice(0, 10);
  const parsedDate = typeof eventDate === 'string' ? new Date(`${eventDate}T00:00:00.000Z`) : new Date(NaN);
  if (typeof eventDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
    || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== eventDate
    || eventDate < today) throw new BookingInputError('Kelajakdagi to‘g‘ri sanani tanlang.');

  const guestCount = data.guestCount;
  if (!Number.isSafeInteger(guestCount) || (guestCount as number) < 1 || (guestCount as number) > hall.capacity) {
    throw new BookingInputError(`Mehmonlar soni 1 dan ${hall.capacity} gacha bo‘lishi kerak.`);
  }
  const customerName = typeof data.customerName === 'string' ? data.customerName.trim() : '';
  const customerPhone = typeof data.customerPhone === 'string' ? data.customerPhone.trim() : '';
  if (customerName.length < 2 || customerName.length > 100) throw new BookingInputError('Ism-familiyangizni kiriting.');
  if (!/^\+?[0-9 ()-]{9,20}$/.test(customerPhone) || customerPhone.replace(/\D/g, '').length < 9) {
    throw new BookingInputError('Telefon raqamini to‘g‘ri kiriting.');
  }

  const services = selectedValues(data.services, new Set(hall.services), 'Xizmatlarni');
  const food = selectedValues(data.food, foodIds, 'Taomlarni');
  if (food.length && (!hall.services.includes('Catering') || !services.includes('Catering'))) {
    throw new BookingInputError('Taom tanlash uchun Katering xizmati kerak.');
  }

  const booking: BookingRequest = {
    id: randomUUID(), venueId: hall.id, venueSlug: hall.slug, venueName: hall.nameUz || hall.name,
    eventDate, guestCount: guestCount as number, customerName, customerPhone,
    services, food, venuePrice: hall.totalPrice, status: 'pending', createdAt: new Date().toISOString(),
  };
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, `${booking.id}.json`), JSON.stringify(booking), { flag: 'wx' });
  return booking;
}

export async function readBookings(): Promise<BookingRequest[]> {
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const bookings = await Promise.all(entries.filter(entry => entry.isFile() && bookingFile.test(entry.name))
    .map(async entry => JSON.parse(await readFile(path.join(root, entry.name), 'utf8')) as BookingRequest));
  return bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
