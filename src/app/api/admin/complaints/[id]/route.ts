import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum(['pending', 'investigating', 'resolved', 'rejected']),
  adminNotes: z.string().trim().max(3000).optional(),
});

export const PATCH = handle(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin(request);
  const { id } = await params;
  const input = patchSchema.parse(await readJson(request));
  try {
    const complaint = await db.complaint.update({ where: { id }, data: { ...input, adminId: admin.id } });
    await db.auditLog.create({ data: { userId: admin.id, action: 'complaint.update', entityType: 'complaint', entityId: id, details: input.status } });
    return ok({ complaint });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new HttpError(404, 'Shikoyat topilmadi.', 'NOT_FOUND');
    throw error;
  }
});
