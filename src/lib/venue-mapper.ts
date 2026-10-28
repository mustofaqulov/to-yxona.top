import type { Prisma } from '@prisma/client';

// Shape consumed by the existing frontend (matches the demo-data hall objects).
export type VenueDto = {
  id: string; slug: string;
  name: string; nameUz: string; nameRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  address: string; addressUz: string; addressRu: string;
  city: string; cityUz: string; cityRu: string;
  district: string; districtUz: string; districtRu: string;
  capacity: number; pricePerPerson: number; totalPrice: number; currency: string;
  rating: number; reviewCount: number; bookingCount: number;
  isVerified: boolean; isFeatured: boolean;
  images: string[]; services: string[];
};

export const venueInclude = {
  city: true,
  district: true,
  images: { orderBy: { order: 'asc' } },
  services: { where: { isAvailable: true }, include: { service: true } },
} satisfies Prisma.WeddingHallInclude;

export type VenueRecord = Prisma.WeddingHallGetPayload<{ include: typeof venueInclude }>;

const FALLBACK_IMAGE = '/toyxona-hero.png';

export function toVenueDto(hall: VenueRecord): VenueDto {
  return {
    id: hall.id, slug: hall.slug,
    name: hall.name, nameUz: hall.nameUz ?? hall.name, nameRu: hall.nameRu ?? hall.name,
    description: hall.description, descriptionUz: hall.descriptionUz ?? hall.description, descriptionRu: hall.descriptionRu ?? hall.description,
    address: hall.address, addressUz: hall.addressUz ?? hall.address, addressRu: hall.addressRu ?? hall.address,
    city: hall.city.name, cityUz: hall.city.nameUz, cityRu: hall.city.nameRu,
    district: hall.district.name, districtUz: hall.district.nameUz, districtRu: hall.district.nameRu,
    capacity: hall.capacity, pricePerPerson: hall.pricePerPerson ?? Math.max(1, Math.round(hall.totalPrice / hall.capacity)),
    totalPrice: hall.totalPrice, currency: hall.currency,
    rating: hall.rating, reviewCount: hall.reviewCount, bookingCount: hall.bookingCount,
    isVerified: hall.isVerified, isFeatured: hall.isFeatured,
    images: hall.images.length ? hall.images.map(image => image.imageUrl) : [FALLBACK_IMAGE],
    services: hall.services.map(entry => entry.service.name),
  };
}
