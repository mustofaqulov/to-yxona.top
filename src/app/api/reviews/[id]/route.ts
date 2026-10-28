import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, readJson } from '@/lib/http';
import { notify } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

async function refreshHallRating(hallId: string) {
  const stats = await db.review.aggregate({ where: { weddingHallId: hallId, isApproved: true }, _avg: { rating: true }, _count: true });
  await db.weddingHall.update({ where: { id: hallId }, data: { rating: Math.round((stats._avg.rating ?? 0) * 10) / 10, reviewCount: stats._count } });
}

export const PATCH = handle(async (request: NextRequest, { params }: Context) => {
  await requireAdmin(request);
  const { id } = await params;
  const { isApproved } = z.object({ isApproved: z.boolean() }).parse(await readJson(request));
  const review = await db.review.findUnique({ where: { id }, include: { weddingHall: { select: { ownerId: true, name: true } } } });
  if (!review) throw new HttpError(404, 'Sharh topilmadi.', 'NOT_FOUND');
  await db.review.update({ where: { id }, data: { isApproved } });
  if (review.weddingHallId) await refreshHallRating(review.weddingHallId);
  if (isApproved && !review.isApproved && review.weddingHall) {
    await notify({ userId: review.weddingHall.ownerId, type: 'REVIEW_PUBLISHED', title: 'Yangi sharh', message: `"${review.weddingHall.name}" uchun yangi sharh e’lon qilindi.`, link: '/admin' });
  }
  return ok({ id, isApproved });
});

export const DELETE = handle(async (request: NextRequest, { params }: Context) => {
  await requireAdmin(request);
  const { id } = await params;
  const review = await db.review.findUnique({ where: { id }, select: { weddingHallId: true } });
  if (!review) throw new HttpError(404, 'Sharh topilmadi.', 'NOT_FOUND');
  await db.review.delete({ where: { id } });
  if (review.weddingHallId) await refreshHallRating(review.weddingHallId);
  return ok({ deleted: true });
});
