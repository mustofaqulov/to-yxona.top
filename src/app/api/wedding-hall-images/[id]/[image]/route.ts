import { readVenueImage } from '@/lib/venue-storage';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; image: string }> }) {
  const { id, image } = await params;
  try {
    const buffer = await readVenueImage(id, image);
    if (!buffer) return new Response(null, { status: 404 });
    const contentType = image.endsWith('.png') ? 'image/png' : image.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return new Response(new Uint8Array(buffer), { headers: {
      'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    } });
  } catch { return new Response(null, { status: 500 }); }
}
