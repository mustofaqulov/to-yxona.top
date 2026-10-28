import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hashPassword, requireUser, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, handle, ok, rateLimit, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'Yangi parol kamida 8 belgidan iborat bo‘lishi kerak.').max(128),
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  rateLimit(`password:${user.id}`, 5, 15 * 60 * 1000);
  const input = passwordSchema.parse(await readJson(request));
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) return fail('Joriy parol noto‘g‘ri.', 400, 'INVALID_CREDENTIALS');
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  return ok({ changed: true });
});
