import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isAdmin, requireUser } from '@/lib/auth';
import { availabilityCalendar } from '@/lib/availability';
import { db } from '@/lib/db';
import { handle, HttpError, ok, readJson } from '@/lib/http';
import { toVenueDto, venueInclude } from '@/lib/venue-mapper';
import { findVenueBySlug } from '@/lib/venue-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ slug: string }> };

const ownerPatch = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(4000),
  address: z.string().trim().min(1).max(250),
  capacity: z.number().int().min(1).max(10000),
  totalPrice: z.number().int().min(1).max(1e12),
  pricePerPerson: z.number().int().min(1).max(1e12),
  isActive: z.boolean(),
}).partial();

const adminPatch = z.object({ isVerified: z.boolean(), isFeatured: z.boolean() }).partial();

export const GET = handle(async (_request: NextRequest, { params }: Context) => {
  const { slug } = await params;
  const hall = await findVenueBySlug(slug);
  if (!hall || !hall.isActive) throw new HttpError(404, 'To‘yxona topilmadi.', 'NOT_FOUND');

  const [reviewRows, availability] = await Promise.all([
    db.review.findMany({ where: { weddingHallId: hall.id, isApproved: true }, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    availabilityCalendar(hall.id),
  ]);
  void db.weddingHall.update({ where: { id: hall.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);

  const reviews = reviewRows.map(review => ({
    id: review.id, weddingHallId: review.weddingHallId, userId: review.userId, userName: review.user.fullName,
    rating: review.rating, comment: review.comment, commentUz: review.comment, commentRu: review.comment,
    date: review.createdAt.toISOString().slice(0, 10),
  }));
  return ok({ hall: toVenueDto(hall), reviews, availability });
});

export const PATCH = handle(async (request: NextRequest, { params }: Context) => {
  const user = await requireUser(request);
  const { slug } = await params;
  const hall = await db.weddingHall.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
  if (!hall) throw new HttpError(404, 'To‘yxona topilmadi.', 'NOT_FOUND');
  const admin = isAdmin(user);
  if (!admin && hall.ownerId !== user.id) throw new HttpError(403, 'Ruxsat yo‘q.', 'FORBIDDEN');

  const body = await readJson(request);
  const fields = ownerPatch.parse(body);
  const moderation = adminPatch.parse(body);
  if (!admin && (moderation.isVerified !== undefined || moderation.isFeatured !== undefined)) throw new HttpError(403, 'Faqat administrator tasdiqlay oladi.', 'FORBIDDEN');
  if (!Object.keys(fields).length && !Object.keys(moderation).length) throw new HttpError(400, 'O‘zgartirish uchun maydon yuborilmadi.', 'VALIDATION_ERROR');

  const updated = await db.weddingHall.update({
    where: { id: hall.id },
    data: {
      ...fields,
      ...(fields.name ? { nameUz: fields.name, nameRu: fields.name } : {}),
      ...(fields.description ? { descriptionUz: fields.description, descriptionRu: fields.description } : {}),
      ...(fields.address ? { addressUz: fields.address, addressRu: fields.address } : {}),
      ...moderation,
      ...(moderation.isVerified !== undefined ? { verificationStatus: moderation.isVerified ? 'VERIFIED' : 'PENDING' } : {}),
    },
    include: venueInclude,
  });
  return ok({ hall: toVenueDto(updated) });
});

/** Soft delete: bookings and reviews keep referencing the hall. */
export const DELETE = handle(async (request: NextRequest, { params }: Context) => {
  const user = await requireUser(request);
  const { slug } = await params;
  const hall = await db.weddingHall.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
  if (!hall) throw new HttpError(404, 'To‘yxona topilmadi.', 'NOT_FOUND');
  if (!isAdmin(user) && hall.ownerId !== user.id) throw new HttpError(403, 'Ruxsat yo‘q.', 'FORBIDDEN');
  await db.weddingHall.update({ where: { id: hall.id }, data: { isActive: false } });
  return ok({ deleted: true });
});
