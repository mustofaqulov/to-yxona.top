import { NextRequest, NextResponse } from 'next/server';
import { allVenues, canManageVenues, createStoredVenue, VenueInputError } from '@/lib/venue-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!canManageVenues(request)) return NextResponse.json({ success: false, error: { message: 'To‘yxona qo‘shish hozircha faqat localhost dev rejimida ishlaydi.' } }, { status: 403 });
  try {
    // Bound the actual streamed body as well as the individual image sizes.
    const reader = request.body?.getReader();
    if (!reader) throw new VenueInputError('Forma ma’lumotlari yuborilmadi.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32 * 1024 * 1024) {
        await reader.cancel();
        return NextResponse.json({ success: false, error: { message: 'Yuklash hajmi juda katta. Rasmlar jami 30 MB dan oshmasin.' } }, { status: 413 });
      }
      chunks.push(value);
    }
    let data: FormData;
    try {
      data = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
    } catch { throw new VenueInputError('Forma ma’lumotlarini qayta yuboring.'); }
    const hall = await createStoredVenue(data);
    return NextResponse.json({ success: true, data: { hall } }, { status: 201, headers: { Location: `/api/wedding-halls/${hall.slug}` } });
  } catch (error) {
    if (error instanceof VenueInputError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
    console.error('Venue creation failed:', error);
    return NextResponse.json({ success: false, error: { message: 'To‘yxonani saqlab bo‘lmadi. Qayta urinib ko‘ring.' } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const city = searchParams.get('city');
    const district = searchParams.get('district');
    const capacity = searchParams.get('capacity');
    const budget = searchParams.get('budget');
    const services = searchParams.get('services');
    const rating = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy') || 'recommended';

    let filteredHalls = await allVenues();

    // Filter by city
    if (city && city !== 'all') {
      filteredHalls = filteredHalls.filter(hall => 
        hall.city.toLowerCase() === city.toLowerCase() ||
        hall.cityUz.toLowerCase() === city.toLowerCase() ||
        hall.cityRu.toLowerCase() === city.toLowerCase()
      );
    }

    // Filter by district
    if (district && district !== 'all') {
      filteredHalls = filteredHalls.filter(hall => 
        hall.district.toLowerCase() === district.toLowerCase() ||
        hall.districtUz.toLowerCase() === district.toLowerCase() ||
        hall.districtRu.toLowerCase() === district.toLowerCase()
      );
    }

    // Filter by capacity
    if (capacity) {
      const minCapacity = parseInt(capacity);
      filteredHalls = filteredHalls.filter(hall => hall.capacity >= minCapacity);
    }

    // Filter by budget
    if (budget) {
      const maxBudget = parseInt(budget);
      filteredHalls = filteredHalls.filter(hall => hall.totalPrice <= maxBudget);
    }

    // Filter by rating
    if (rating) {
      const minRating = parseFloat(rating);
      filteredHalls = filteredHalls.filter(hall => hall.rating >= minRating);
    }

    // Filter by services
    if (services) {
      const requiredServices = services.split(',').map(s => s.trim().toLowerCase());
      filteredHalls = filteredHalls.filter(hall => {
        const hallServices = hall.services.map(s => s.toLowerCase());
        return requiredServices.every(service => hallServices.includes(service));
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        filteredHalls.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      case 'price-desc':
        filteredHalls.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case 'rating':
        filteredHalls.sort((a, b) => b.rating - a.rating);
        break;
      case 'most-booked':
        filteredHalls.sort((a, b) => b.bookingCount - a.bookingCount);
        break;
      case 'newest':
        filteredHalls.sort((a, b) => b.id.localeCompare(a.id));
        break;
      default: // recommended
        filteredHalls.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return b.rating - a.rating;
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        halls: filteredHalls,
        total: filteredHalls.length,
      },
    });
  } catch (error) {
    console.error('Wedding halls search error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred while searching wedding halls' } },
      { status: 500 }
    );
  }
}
