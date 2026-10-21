import { NextRequest, NextResponse } from 'next/server';
import { BookingInputError, createBooking, readBookings } from '@/lib/booking-storage';
import { canManageVenues } from '@/lib/venue-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function canReadBookings(request: NextRequest) {
  const url = request.nextUrl;
  const origin = request.headers.get('origin');
  return process.env.NODE_ENV === 'development'
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    && (!origin || origin === url.origin)
    && ['same-origin', 'none', null].includes(request.headers.get('sec-fetch-site'));
}

export async function GET(request: NextRequest) {
  if (!canReadBookings(request)) return NextResponse.json({ success: false }, { status: 403 });
  try {
    return NextResponse.json({ success: true, data: { bookings: await readBookings() } });
  } catch (error) {
    console.error('Booking list failed:', error);
    return NextResponse.json({ success: false, error: { message: 'Buyurtmalarni yuklab bo‘lmadi.' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!canManageVenues(request)) return NextResponse.json({ success: false, error: { message: 'Buyurtma yuborish hozircha faqat localhost dev rejimida ishlaydi.' } }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ success: false, error: { message: 'JSON ma’lumot yuboring.' } }, { status: 415 });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new BookingInputError('So‘rov ma’lumotlari yo‘q.');
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        return NextResponse.json({ success: false, error: { message: 'So‘rov hajmi juda katta.' } }, { status: 413 });
      }
      chunks.push(value);
    }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new BookingInputError('JSON ma’lumot noto‘g‘ri.'); }
    const booking = await createBooking(input);
    return NextResponse.json({ success: true, data: { id: booking.id, status: booking.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingInputError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
    console.error('Booking creation failed:', error);
    return NextResponse.json({ success: false, error: { message: 'Buyurtmani saqlab bo‘lmadi.' } }, { status: 500 });
  }
}
