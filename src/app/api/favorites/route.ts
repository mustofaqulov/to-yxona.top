import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, readJson } from '@/lib/http';
import { toVenueDto, venueInclude } from '@/lib/venue-mapper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ hallId: z.string().trim().min(1).max(100) });

export const GET = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const rows = await db.favorite.findMany({
    where: { userId: user.id, weddingHall: { isActive: true } },
    include: { weddingHall: { include: venueInclude } },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ halls: rows.map(row => toVenueDto(row.weddingHall)) });
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { hallId } = bodySchema.parse(await readJson(request));
  const hall = await db.weddingHall.findFirst({ where: { OR: [{ id: hallId }, { slug: hallId }], isActive: true }, select: { id: true } });
  if (!hall) throw new HttpError(404, 'To‘yxona topilmadi.', 'NOT_FOUND');
  await db.favorite.upsert({
    where: { userId_weddingHallId: { userId: user.id, weddingHallId: hall.id } },
    create: { userId: user.id, weddingHallId: hall.id },
    update: {},
  });
  return ok({ hallId: hall.id, favorite: true }, 201);
});

export const DELETE = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { hallId } = bodySchema.parse(await readJson(request));
  const hall = await db.weddingHall.findFirst({ where: { OR: [{ id: hallId }, { slug: hallId }] }, select: { id: true } });
  if (hall) await db.favorite.deleteMany({ where: { userId: user.id, weddingHallId: hall.id } });
  return ok({ hallId, favorite: false });
});
