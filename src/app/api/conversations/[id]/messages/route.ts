import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, HttpError, ok, pageParams, rateLimit, readJson } from '@/lib/http';
import { notify } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

async function participantConversation(id: string, user: User) {
  const conversation = await db.conversation.findUnique({ where: { id } });
  // 404 (not 403) so conversation ids of other users are not revealed.
  if (!conversation || (conversation.userId !== user.id && conversation.businessId !== user.id)) throw new HttpError(404, 'Suhbat topilmadi.', 'NOT_FOUND');
  return conversation;
}

export const GET = handle(async (request: NextRequest, { params }: Context) => {
  const user = await requireUser(request);
  const { id } = await params;
  await participantConversation(id, user);
  const { page, limit, skip } = pageParams(request, 50, 200);
  const [rows, total] = await Promise.all([
    db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    db.message.count({ where: { conversationId: id } }),
  ]);
  await db.message.updateMany({ where: { conversationId: id, receiverId: user.id, isRead: false }, data: { isRead: true } });
  return ok({ messages: rows.reverse(), total, page, limit });
});

export const POST = handle(async (request: NextRequest, { params }: Context) => {
  const user = await requireUser(request);
  const { id } = await params;
  rateLimit(`message:${user.id}`, 30, 60 * 1000);
  const { content } = z.object({ content: z.string().trim().min(1, 'Xabar bo‘sh bo‘lmasin.').max(2000) }).parse(await readJson(request));
  const conversation = await participantConversation(id, user);
  const receiverId = conversation.userId === user.id ? conversation.businessId : conversation.userId;
  const message = await db.$transaction(async tx => {
    const created = await tx.message.create({ data: { conversationId: id, senderId: user.id, receiverId, content } });
    await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await notify({ userId: receiverId, type: 'NEW_MESSAGE', title: 'Yangi xabar', message: `${user.fullName}: ${content.slice(0, 80)}`, link: `/messages/${id}` }, tx);
    return created;
  });
  return ok({ message }, 201);
});
