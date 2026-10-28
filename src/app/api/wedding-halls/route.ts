import { NextRequest } from 'next/server';
import { requireVenueManager } from '@/lib/auth';
import { fail, handle, HttpError, ok } from '@/lib/http';
import { createVenue, listVenues, VenueInputError } from '@/lib/venue-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

export const POST = handle(async (request: NextRequest) => {
  const user = await requireVenueManager(request);
  // Bound the actual streamed body as well as the individual image sizes.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Forma ma’lumotlari yuborilmadi.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'Yuklash hajmi juda katta. Rasmlar jami 30 MB dan oshmasin.', 'PAYLOAD_TOO_LARGE');
    }
    chunks.push(value);
  }
  let data: FormData;
  try {
    data = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
  } catch { throw new HttpError(400, 'Forma ma’lumotlarini qayta yuboring.'); }
  try {
    const hall = await createVenue(data, user);
    return ok({ hall }, 201, { Location: `/api/wedding-halls/${hall.slug}` });
  } catch (error) {
    if (error instanceof VenueInputError) return fail(error.message, 400, 'VALIDATION_ERROR');
    throw error;
  }
});

export const GET = handle(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const halls = await listVenues({
    city: params.get('city'), district: params.get('district'), capacity: params.get('capacity'),
    budget: params.get('budget'), rating: params.get('rating'), services: params.get('services'),
    sortBy: params.get('sortBy') || 'recommended', q: params.get('q'),
  });
  return ok({ halls, total: halls.length });
});
