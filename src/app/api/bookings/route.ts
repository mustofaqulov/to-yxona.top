import { NextRequest } from 'next/server';
import { BookingStatus } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { createBooking, listBookings } from '@/lib/booking-storage';
import { handle, ok, pageParams, rateLimit, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { page, limit, skip } = pageParams(request, 50);
  const statusParam = request.nextUrl.searchParams.get('status')?.toUpperCase() ?? null;
  const status = statusParam && statusParam in BookingStatus ? (statusParam as BookingStatus) : null;
  const { bookings, total } = await listBookings(user, status, skip, limit);
  return ok({ bookings, total, page, limit });
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  rateLimit(`booking:${user.id}`, 10, 60 * 60 * 1000);
  const booking = await createBooking(await readJson(request), user);
  return ok({ id: booking.id, status: booking.status, booking }, 201);
});
