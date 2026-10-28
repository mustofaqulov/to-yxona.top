import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'ERROR') {
    super(message);
  }
}

export function ok<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function fail(message: string, status = 400, code = 'ERROR') {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const DEFAULT_BODY_LIMIT = 16 * 1024;

/** Reads a size-bounded JSON body. Throws HttpError on bad content type, size or syntax. */
export async function readJson(request: NextRequest, maxBytes = DEFAULT_BODY_LIMIT): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON ma’lumot yuboring.', 'UNSUPPORTED_MEDIA_TYPE');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'So‘rov ma’lumotlari yo‘q.', 'EMPTY_BODY');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'So‘rov hajmi juda katta.', 'PAYLOAD_TOO_LARGE');
    }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'JSON ma’lumot noto‘g‘ri.', 'INVALID_JSON'); }
}

/** Wraps a route handler: maps HttpError / ZodError to responses and hides unexpected errors. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof HttpError) return fail(error.message, error.status, error.code);
      if (error instanceof ZodError) return fail(error.issues[0]?.message ?? 'Ma’lumotlar noto‘g‘ri.', 400, 'VALIDATION_ERROR');
      console.error('Unhandled API error:', error);
      return fail('Server xatosi. Qayta urinib ko‘ring.', 500, 'SERVER_ERROR');
    }
  };
}

const hits = new Map<string, { count: number; resetAt: number }>();

/** Fixed-window in-memory rate limiter (per server instance). */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > max) throw new HttpError(429, 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.', 'RATE_LIMITED');
}

export function clientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function pageParams(request: NextRequest, defaultLimit = 20, maxLimit = 100) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(params.get('limit') ?? String(defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
