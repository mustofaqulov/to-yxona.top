import { z } from 'zod';

/** Uzbek phone in API form: +998 followed by 9 digits. */
export const phoneSchema = z.string().trim().regex(/^\+998\d{9}$/, 'Telefon raqami +998XXXXXXXXX ko‘rinishida bo‘lishi kerak.');

export const idSchema = z.string().trim().min(1).max(64);

/** Calendar date as YYYY-MM-DD, validated to be a real date. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD ko‘rinishida bo‘lishi kerak.')
  .refine(value => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, 'Sana noto‘g‘ri.');

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
