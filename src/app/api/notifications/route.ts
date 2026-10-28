import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok, pageParams, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { page, limit, skip } = pageParams(request, 30);
  const [notifications, total, unread] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    db.notification.count({ where: { userId: user.id } }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);
  return ok({ notifications, total, unread, page, limit });
});

/** Marks the given notifications (or all, when ids is omitted) as read. */
export const PATCH = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { ids } = z.object({ ids: z.array(z.string().max(64)).max(200).optional() }).parse(await readJson(request));
  const result = await db.notification.updateMany({
    where: { userId: user.id, isRead: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { isRead: true },
  });
  return ok({ updated: result.count });
});
