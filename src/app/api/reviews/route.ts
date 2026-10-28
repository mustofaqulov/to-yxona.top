import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, handle, HttpError, ok, pageParams, readJson } from '@/lib/http';
import { idSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  bookingId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3, 'Sharh kamida 3 belgidan iborat bo‘lsin.').max(2000),
});

/** Public list of approved reviews for a hall: /api/reviews?hall=<slug> */
export const GET = handle(async (request: NextRequest) => {
  const slug = request.nextUrl.searchParams.get('hall');
  if (!slug) throw new HttpError(400, 'hall parametri kerak.', 'VALIDATION_ERROR');
  const { page, limit, skip } = pageParams(request, 20);
  const where = { isApproved: true, weddingHall: { slug } };
  const [rows, total] = await Promise.all([
    db.review.findMany({ where, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    db.review.count({ where }),
  ]);
  const reviews = rows.map(review => ({ id: review.id, userName: review.user.fullName, rating: review.rating, comment: review.comment, date: review.createdAt.toISOString().slice(0, 10) }));
  return ok({ reviews, total, page, limit });
});

/** Only the customer of a completed booking may review it, once. Reviews await admin approval. */
export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const input = createSchema.parse(await readJson(request));
  const booking = await db.booking.findUnique({ where: { id: input.bookingId }, select: { userId: true, status: true, weddingHallId: true } });
  if (!booking || booking.userId !== user.id) throw new HttpError(404, 'Buyurtma topilmadi.', 'NOT_FOUND');
  if (booking.status !== 'COMPLETED') throw new HttpError(409, 'Sharh faqat yakunlangan buyurtma uchun qoldiriladi.', 'INVALID_STATE');
  try {
    const review = await db.review.create({
      data: { userId: user.id, bookingId: input.bookingId, weddingHallId: booking.weddingHallId, rating: input.rating, comment: input.comment, isVerified: true },
    });
    return ok({ id: review.id, isApproved: review.isApproved }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return fail('Bu buyurtmaga sharh allaqachon qoldirilgan.', 409, 'REVIEW_EXISTS');
    throw error;
  }
});
