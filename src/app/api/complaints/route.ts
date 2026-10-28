import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, pageParams, rateLimit, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  entityType: z.enum(['wedding_hall', 'service_provider']),
  entityId: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10, 'Shikoyat matni kamida 10 belgidan iborat bo‘lsin.').max(3000),
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  rateLimit(`complaint:${user.id}`, 5, 60 * 60 * 1000);
  const input = createSchema.parse(await readJson(request));
  const exists = input.entityType === 'wedding_hall'
    ? await db.weddingHall.findUnique({ where: { id: input.entityId }, select: { id: true } })
    : await db.serviceProvider.findUnique({ where: { id: input.entityId }, select: { id: true } });
  if (!exists) throw new HttpError(404, 'Shikoyat qilinayotgan obyekt topilmadi.', 'NOT_FOUND');
  const complaint = await db.complaint.create({ data: { userId: user.id, ...input } });
  return ok({ id: complaint.id, status: complaint.status }, 201);
});

/** Admin only: /api/complaints?status=pending */
export const GET = handle(async (request: NextRequest) => {
  await requireAdmin(request);
  const { page, limit, skip } = pageParams(request, 30);
  const status = request.nextUrl.searchParams.get('status');
  const where = status ? { status } : {};
  const [complaints, total] = await Promise.all([
    db.complaint.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    db.complaint.count({ where }),
  ]);
  return ok({ complaints, total, page, limit });
});
