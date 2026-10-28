import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { changeBookingStatus } from '@/lib/booking-storage';
import { handle, ok, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({ status: z.enum(['CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED']) });

export const PATCH = handle(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const { status } = patchSchema.parse(await readJson(request));
  return ok({ booking: await changeBookingStatus(id, status, user) });
});
