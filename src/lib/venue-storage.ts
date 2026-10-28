import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Prisma, User } from '@prisma/client';
import { db } from './db';
import { toVenueDto, venueInclude, type VenueDto } from './venue-mapper';
import { isStoredVenueId } from './venue-id';

export type StoredVenue = VenueDto;

// Uploaded photos live on disk; the database stores their /api/wedding-hall-images URLs.
const uploadRoot = path.join(process.cwd(), '.data', 'uploads');
const photoPattern = /^\d{1,2}\.(jpg|png|webp)$/;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_PHOTOS = 10;

export class VenueInputError extends Error {}

function requiredText(data: FormData, key: string, label: string, max: number) {
  const value = data.get(key);
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new VenueInputError(`${label} maydonini to‘g‘ri to‘ldiring.`);
  return value.trim();
}

function positiveInteger(value: FormDataEntryValue | null, label: string, max: number) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new VenueInputError(`${label} qiymati 1 dan ${max.toLocaleString('en-US')} gacha bo‘lishi kerak.`);
  return number;
}

function imageExtension(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export type VenueFilters = {
  city?: string | null; district?: string | null; capacity?: string | null; budget?: string | null;
  rating?: string | null; services?: string | null; sortBy?: string | null; q?: string | null;
};

function positiveNumber(value: string | null | undefined) {
  const number = value ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

const insensitive = (value: string) => ({ equals: value, mode: 'insensitive' as const });

export async function listVenues(filters: VenueFilters): Promise<VenueDto[]> {
  const and: Prisma.WeddingHallWhereInput[] = [{ isActive: true }];
  const { city, district, services, q } = filters;
  if (city && city !== 'all') and.push({ city: { OR: [{ name: insensitive(city) }, { nameUz: insensitive(city) }, { nameRu: insensitive(city) }] } });
  if (district && district !== 'all') and.push({ district: { OR: [{ name: insensitive(district) }, { nameUz: insensitive(district) }, { nameRu: insensitive(district) }] } });
  const capacity = positiveNumber(filters.capacity);
  if (capacity) and.push({ capacity: { gte: capacity } });
  const budget = positiveNumber(filters.budget);
  if (budget) and.push({ totalPrice: { lte: budget } });
  const rating = positiveNumber(filters.rating);
  if (rating) and.push({ rating: { gte: rating } });
  if (services) {
    for (const name of services.split(',').map(item => item.trim()).filter(Boolean).slice(0, 12)) {
      and.push({ services: { some: { isAvailable: true, service: { name: insensitive(name) } } } });
    }
  }
  if (q?.trim()) and.push({ OR: [{ name: { contains: q.trim(), mode: 'insensitive' } }, { address: { contains: q.trim(), mode: 'insensitive' } }] });

  const orderBy: Prisma.WeddingHallOrderByWithRelationInput[] = (() => {
    switch (filters.sortBy) {
      case 'price-asc': return [{ totalPrice: 'asc' }];
      case 'price-desc': return [{ totalPrice: 'desc' }];
      case 'rating': return [{ rating: 'desc' }];
      case 'most-booked': return [{ bookingCount: 'desc' }];
      case 'newest': return [{ createdAt: 'desc' }];
      default: return [{ isFeatured: 'desc' }, { rating: 'desc' }];
    }
  })();

  const halls = await db.weddingHall.findMany({ where: { AND: and }, orderBy, include: venueInclude, take: 200 });
  return halls.map(toVenueDto);
}

export async function findVenueBySlug(slug: string) {
  return db.weddingHall.findUnique({ where: { slug }, include: venueInclude });
}

async function resolveLocation(cityName: string, districtName: string) {
  const city = await db.city.findFirst({ where: { OR: [{ name: insensitive(cityName) }, { nameUz: insensitive(cityName) }, { nameRu: insensitive(cityName) }] } })
    ?? await db.city.create({ data: { name: cityName, nameUz: cityName, nameRu: cityName, region: cityName, regionUz: cityName, regionRu: cityName } });
  const district = await db.district.findFirst({ where: { cityId: city.id, OR: [{ name: insensitive(districtName) }, { nameUz: insensitive(districtName) }, { nameRu: insensitive(districtName) }] } })
    ?? await db.district.create({ data: { name: districtName, nameUz: districtName, nameRu: districtName, cityId: city.id } });
  return { city, district };
}

export async function createVenue(data: FormData, owner: User): Promise<VenueDto> {
  const name = requiredText(data, 'name', 'To‘yxona nomi', 100);
  const cityName = requiredText(data, 'city', 'Shahar', 80);
  const districtName = requiredText(data, 'district', 'Tuman', 80);
  const address = requiredText(data, 'address', 'Manzil', 250);
  const capacity = positiveInteger(data.get('capacity'), 'Sig‘im', 10000);
  const totalPrice = positiveInteger(data.get('totalPrice'), 'Umumiy narx', 1e12);
  const personPrice = data.get('pricePerPerson');
  const pricePerPerson = typeof personPrice === 'string' && personPrice.trim()
    ? positiveInteger(personPrice, 'Bir mehmon uchun narx', 1e12) : Math.max(1, Math.round(totalPrice / capacity));
  const descriptionValue = data.get('description') ?? '';
  if (typeof descriptionValue !== 'string' || descriptionValue.length > 4000) throw new VenueInputError('Tavsif 4000 belgidan oshmasligi kerak.');
  const description = descriptionValue.trim() || name;

  const serviceNames = [...new Set(data.getAll('services'))];
  if (serviceNames.some(value => typeof value !== 'string')) throw new VenueInputError('Xizmatlarni ro‘yxatdan tanlang.');
  const serviceRows = await db.service.findMany({ where: { name: { in: serviceNames as string[] }, isActive: true } });
  if (serviceRows.length !== serviceNames.length) throw new VenueInputError('Xizmatlarni ro‘yxatdan tanlang.');

  const photos = data.getAll('images');
  if (photos.length > MAX_PHOTOS) throw new VenueInputError(`Ko‘pi bilan ${MAX_PHOTOS} ta rasm qo‘shish mumkin.`);
  const id = `hall-${Date.now()}-${randomUUID()}`;
  const uploads: { name: string; buffer: Buffer }[] = [];
  const imageUrls: string[] = [];
  let bytes = 0;
  for (const [index, photo] of photos.entries()) {
    if (typeof photo === 'string') {
      let url: URL;
      try { url = new URL(photo); } catch { throw new VenueInputError('Rasm havolasini to‘g‘ri kiriting.'); }
      if (photo.length > 2000 || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new VenueInputError('Rasm havolasi http:// yoki https:// bilan boshlanishi kerak.');
      imageUrls.push(url.href);
      continue;
    }
    if (!photo.size || photo.size > MAX_PHOTO_BYTES) throw new VenueInputError('Har bir rasm hajmi 5 MB dan oshmasligi kerak.');
    bytes += photo.size;
    if (bytes > MAX_TOTAL_BYTES) throw new VenueInputError('Rasmlarning umumiy hajmi 30 MB dan oshmasligi kerak.');
    const buffer = Buffer.from(await photo.arrayBuffer());
    const extension = imageExtension(buffer);
    if (!extension) throw new VenueInputError('Faqat JPG, PNG yoki WebP rasmlarini yuklang.');
    const filename = `${index}.${extension}`;
    uploads.push({ name: filename, buffer });
    imageUrls.push(`/api/wedding-hall-images/${id}/${filename}`);
  }

  const { city, district } = await resolveLocation(cityName, districtName);
  const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'toyxona';
  const folder = path.join(uploadRoot, id);
  try {
    if (uploads.length) {
      await mkdir(folder, { recursive: true });
      await Promise.all(uploads.map(photo => writeFile(path.join(folder, photo.name), photo.buffer, { flag: 'wx' })));
    }
    const hall = await db.weddingHall.create({
      data: {
        id, slug: `${slugName}-${id}`, ownerId: owner.id, cityId: city.id, districtId: district.id,
        name, nameUz: name, nameRu: name, description, descriptionUz: description, descriptionRu: description,
        address, addressUz: address, addressRu: address, capacity, totalPrice, pricePerPerson,
        images: { create: imageUrls.map((imageUrl, order) => ({ imageUrl, order, isMain: order === 0 })) },
        services: { create: serviceRows.map(service => ({ serviceId: service.id })) },
      },
      include: venueInclude,
    });
    return toVenueDto(hall);
  } catch (error) {
    await rm(folder, { recursive: true, force: true });
    throw error;
  }
}

export async function removeVenueFiles(id: string) {
  if (isStoredVenueId(id)) await rm(path.join(uploadRoot, id), { recursive: true, force: true });
}

export async function readVenueImage(id: string, image: string) {
  if (!isStoredVenueId(id) || !photoPattern.test(image)) return null;
  const record = await db.weddingHallImage.findFirst({ where: { weddingHallId: id, imageUrl: `/api/wedding-hall-images/${id}/${image}` } });
  if (!record) return null;
  try { return await readFile(path.join(uploadRoot, id, image)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
