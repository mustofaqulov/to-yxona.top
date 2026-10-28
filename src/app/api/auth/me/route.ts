import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser, toPublicUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  profileImage: z.string().trim().max(2000).url().refine(value => /^https?:\/\//.test(value), 'Rasm havolasi http:// yoki https:// bilan boshlanishi kerak.').nullable(),
  email: z.string().trim().toLowerCase().email().max(200).nullable(),
}).partial();

export const GET = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  return ok({ user: toPublicUser(user) });
});

export const PATCH = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const changes = profileSchema.parse(await readJson(request));
  const updated = await db.user.update({ where: { id: user.id }, data: changes });
  return ok({ user: toPublicUser(updated) });
});
