import { NextRequest, NextResponse } from 'next/server';
import { demoReviews } from '@/lib/demo-data';
import { allVenues, canManageVenues, setVenueVerified } from '@/lib/venue-storage';
import { isStoredVenueId } from '@/lib/venue-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!canManageVenues(request)) return NextResponse.json({ success: false }, { status: 403 });
  try {
    const body = await request.json();
    if (!body || typeof body.isVerified !== 'boolean') return NextResponse.json({ success: false }, { status: 400 });
    const { slug } = await params;
    const hall = await setVenueVerified(slug, body.isVerified);
    return NextResponse.json({ success: !!hall, data: { hall } }, { status: hall ? 200 : 404 });
  } catch { return NextResponse.json({ success: false }, { status: 500 }); }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const hall = (await allVenues()).find(h => h.slug === slug);

    if (!hall) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Wedding hall not found' } },
        { status: 404 }
      );
    }

    // Get reviews for this hall
    const hallReviews = demoReviews.filter(r => r.weddingHallId === hall.id);

    // Generate availability calendar (demo)
    const today = new Date();
    const availability = [];
    for (let i = 0; i < (isStoredVenueId(hall.id) ? 0 : 30); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Random availability for demo
      const statuses = ['available', 'available', 'available', 'pending', 'booked'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      availability.push({
        date: dateStr,
        status,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hall,
        reviews: hallReviews,
        availability,
      },
    });
  } catch (error) {
    console.error('Wedding hall detail error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred while fetching wedding hall details' } },
      { status: 500 }
    );
  }
}
