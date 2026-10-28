import type { Prisma } from '@prisma/client';
import { db } from './db';

export type DayStatus = 'available' | 'pending' | 'booked';
export const AVAILABILITY_DAYS = 60;

/** Bookings in these states hold the date. */
export const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;

export function dayStart(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function availabilityCalendar(hallId: string, days = AVAILABILITY_DAYS) {
  const from = dayStart(new Date().toISOString().slice(0, 10));
  const to = new Date(from.getTime() + days * 86_400_000);
  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({ where: { weddingHallId: hallId, date: { gte: from, lt: to }, status: { in: [...ACTIVE_BOOKING_STATUSES] } }, select: { date: true, status: true } }),
    db.weddingHallAvailability.findMany({ where: { weddingHallId: hallId, date: { gte: from, lt: to } }, select: { date: true, status: true } }),
  ]);
  const byDate = new Map<string, DayStatus>();
  for (const block of blocks) if (block.status === 'booked' || block.status === 'pending') byDate.set(block.date.toISOString().slice(0, 10), block.status);
  for (const booking of bookings) {
    const key = booking.date.toISOString().slice(0, 10);
    if (booking.status === 'CONFIRMED' || byDate.get(key) !== 'booked') byDate.set(key, booking.status === 'CONFIRMED' ? 'booked' : 'pending');
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(from.getTime() + index * 86_400_000).toISOString().slice(0, 10);
    return { date, status: byDate.get(date) ?? ('available' as DayStatus) };
  });
}

/** True when the date is held by an active booking or blocked by the owner. Use inside a transaction. */
export async function isDateTaken(tx: Prisma.TransactionClient, hallId: string, date: Date, excludeBookingId?: string) {
  const [booking, block] = await Promise.all([
    tx.booking.findFirst({ where: { weddingHallId: hallId, date, status: { in: [...ACTIVE_BOOKING_STATUSES] }, ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) }, select: { id: true } }),
    tx.weddingHallAvailability.findFirst({ where: { weddingHallId: hallId, date, status: 'booked', bookingId: null }, select: { id: true } }),
  ]);
  return Boolean(booking || block);
}
