import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok } from '@/lib/http';
import { expireStaleBookings } from '@/lib/booking-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (request: NextRequest) => {
  await requireAdmin(request);
  await expireStaleBookings();
  const [users, halls, verifiedHalls, bookings, pendingBookings, confirmedRevenue, pendingReviews, openComplaints] = await Promise.all([
    db.user.count(),
    db.weddingHall.count({ where: { isActive: true } }),
    db.weddingHall.count({ where: { isActive: true, isVerified: true } }),
    db.booking.count(),
    db.booking.count({ where: { status: 'PENDING' } }),
    db.booking.aggregate({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }, _sum: { totalPrice: true } }),
    db.review.count({ where: { isApproved: false } }),
    db.complaint.count({ where: { status: { in: ['pending', 'investigating'] } } }),
  ]);
  return ok({ users, halls, verifiedHalls, bookings, pendingBookings, revenue: confirmedRevenue._sum.totalPrice ?? 0, pendingReviews, openComplaints });
});
