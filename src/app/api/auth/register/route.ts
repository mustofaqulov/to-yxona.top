import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { hashPassword, signToken, toPublicUser } from '@/lib/auth';
import { clientIp, fail, handle, ok, rateLimit, readJson } from '@/lib/http';
import { phoneSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only self-service roles can be requested; admin roles are never assignable here.
const registerSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8, 'Parol kamida 8 belgidan iborat bo‘lishi kerak.').max(128),
  fullName: z.string().trim().min(2, 'Ism-familiyangizni kiriting.').max(100),
  role: z.enum(['CUSTOMER', 'WEDDING_HALL_OWNER']).default('CUSTOMER'),
});

export const POST = handle(async (request: NextRequest) => {
  rateLimit(`register:${clientIp(request)}`, 10, 60 * 60 * 1000);
  const input = registerSchema.parse(await readJson(request));
  try {
    const user = await db.user.create({
      data: { phone: input.phone, fullName: input.fullName, role: input.role, passwordHash: await hashPassword(input.password) },
    });
    return ok({ user: toPublicUser(user), token: signToken(user) }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return fail('Bu telefon raqami allaqachon ro‘yxatdan o‘tgan.', 409, 'USER_EXISTS');
    }
    throw error;
  }
});
