import type { NotificationType, Prisma } from '@prisma/client';
import { db } from './db';

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

/** Creates a notification; pass a transaction client to make it atomic with the triggering change. */
export async function notify(input: NotifyInput, client: Prisma.TransactionClient | typeof db = db) {
  return client.notification.create({
    data: { userId: input.userId, type: input.type, title: input.title, titleUz: input.title, message: input.message, messageUz: input.message, link: input.link },
  });
}
