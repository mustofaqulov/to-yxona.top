import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, pageParams, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const userSelect = { id: true, phone: true, fullName: true, role: true, isActive: true, createdAt: true } as const;

export const GET = handle(async (request: NextRequest) => {
  await requireAdmin(request);
  const { page, limit, skip } = pageParams(request, 30);
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const where = q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] } : {};
  const [users, total] = await Promise.all([
    db.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    db.user.count({ where }),
  ]);
  return ok({ users, total, page, limit });
});

const patchSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  isActive: z.boolean().optional(),
  role: z.enum(['CUSTOMER', 'WEDDING_HALL_OWNER', 'SERVICE_PROVIDER']).optional(),
});

/** Activate/deactivate an account or switch its self-service role. Admin roles are managed in the database only. */
export const PATCH = handle(async (request: NextRequest) => {
  const admin = await requireAdmin(request);
  const { userId, ...changes } = patchSchema.parse(await readJson(request));
  if (userId === admin.id) throw new HttpError(400, 'O‘z akkauntingizni o‘zgartirib bo‘lmaydi.', 'VALIDATION_ERROR');
  const target = await db.user.findUnique({ where: { id: userId }, select: { isAdmin: true, role: true } });
  if (!target) throw new HttpError(404, 'Foydalanuvchi topilmadi.', 'NOT_FOUND');
  if (target.isAdmin || target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') throw new HttpError(403, 'Administrator akkauntini o‘zgartirib bo‘lmaydi.', 'FORBIDDEN');
  const user = await db.user.update({ where: { id: userId }, data: changes, select: userSelect });
  await db.auditLog.create({ data: { userId: admin.id, action: 'user.update', entityType: 'user', entityId: userId, details: JSON.stringify(changes) } });
  return ok({ user });
});
