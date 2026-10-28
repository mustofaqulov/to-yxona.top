import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signToken, toPublicUser, verifyPassword } from '@/lib/auth';
import { clientIp, fail, handle, ok, rateLimit, readJson } from '@/lib/http';
import { phoneSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({ phone: phoneSchema, password: z.string().min(1).max(128) });

export const POST = handle(async (request: NextRequest) => {
  const input = loginSchema.parse(await readJson(request));
  rateLimit(`login:${clientIp(request)}:${input.phone}`, 8, 15 * 60 * 1000);
  const user = await db.user.findUnique({ where: { phone: input.phone } });
  // Same message for unknown phone and wrong password to avoid account enumeration.
  if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
    return fail('Telefon raqami yoki parol noto‘g‘ri.', 401, 'INVALID_CREDENTIALS');
  }
  return ok({ user: toPublicUser(user), token: signToken(user) });
});
