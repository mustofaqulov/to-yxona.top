import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const rows = await db.conversation.findMany({
    where: { isActive: true, OR: [{ userId: user.id }, { businessId: user.id }] },
    include: {
      user: { select: { id: true, fullName: true } },
      business: { select: { id: true, fullName: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { receiverId: user.id, isRead: false } } } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  const conversations = rows.map(row => ({
    id: row.id, weddingHallId: row.weddingHallId,
    counterpart: row.userId === user.id ? row.business : row.user,
    lastMessage: row.messages[0] ?? null, unread: row._count.messages, updatedAt: row.updatedAt,
  }));
  return ok({ conversations });
});

/** Starts (or reuses) a conversation between the signed-in customer and a hall's owner. */
export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { weddingHallId } = z.object({ weddingHallId: z.string().trim().min(1).max(100) }).parse(await readJson(request));
  const hall = await db.weddingHall.findFirst({ where: { OR: [{ id: weddingHallId }, { slug: weddingHallId }], isActive: true }, select: { id: true, ownerId: true } });
  if (!hall) throw new HttpError(404, 'To‘yxona topilmadi.', 'NOT_FOUND');
  if (hall.ownerId === user.id) throw new HttpError(400, 'O‘z to‘yxonangizga yozib bo‘lmaydi.', 'VALIDATION_ERROR');
  const existing = await db.conversation.findFirst({ where: { userId: user.id, businessId: hall.ownerId, weddingHallId: hall.id } });
  const conversation = existing ?? await db.conversation.create({ data: { userId: user.id, businessId: hall.ownerId, weddingHallId: hall.id } });
  return ok({ conversation }, existing ? 200 : 201);
});
