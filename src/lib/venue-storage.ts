import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { demoServices, demoWeddingHalls } from './demo-data';
import { isStoredVenueId } from './venue-id';

export type StoredVenue = typeof demoWeddingHalls[number];
const root = path.join(process.cwd(), '.data', 'wedding-halls');
const photoPattern = /^\d{1,2}\.(jpg|png|webp)$/;

export class VenueInputError extends Error {}

// The existing admin has no authentication. Permit writes only on the local dev
// origin until authenticated admin access and production storage are configured.
export function canManageVenues(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV === 'development'
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    && request.headers.get('origin') === url.origin
    && request.headers.get('sec-fetch-site') !== 'cross-site';
}

export async function readStoredVenues(): Promise<StoredVenue[]> {
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const halls = await Promise.all(entries.filter(entry => entry.isDirectory() && isStoredVenueId(entry.name)).map(async entry => {
    try { return JSON.parse(await readFile(path.join(root, entry.name, 'venue.json'), 'utf8')) as StoredVenue; }
    catch (error) {
      // A directory may still be receiving photos; metadata is published last.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }));
  return halls.filter((hall): hall is StoredVenue => hall !== null).sort((a, b) => b.id.localeCompare(a.id));
}

export async function allVenues() {
  return [...await readStoredVenues(), ...demoWeddingHalls];
}

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

export async function createStoredVenue(data: FormData): Promise<StoredVenue> {
  const name = requiredText(data, 'name', 'To‘yxona nomi', 100);
  const city = requiredText(data, 'city', 'Shahar', 80);
  const district = requiredText(data, 'district', 'Tuman', 80);
  const address = requiredText(data, 'address', 'Manzil', 250);
  const capacity = positiveInteger(data.get('capacity'), 'Sig‘im', 10000);
  const totalPrice = positiveInteger(data.get('totalPrice'), 'Umumiy narx', 1e12);
  const personPrice = data.get('pricePerPerson');
  const pricePerPerson = typeof personPrice === 'string' && personPrice.trim()
    ? positiveInteger(personPrice, 'Bir mehmon uchun narx', 1e12) : Math.max(1, Math.round(totalPrice / capacity));
  const descriptionValue = data.get('description') ?? '';
  if (typeof descriptionValue !== 'string' || descriptionValue.length > 4000) throw new VenueInputError('Tavsif 4000 belgidan oshmasligi kerak.');
  const description = descriptionValue.trim();
  const services = [...new Set(data.getAll('services'))];
  if (services.some(value => typeof value !== 'string' || !demoServices.some(service => service.name === value))) throw new VenueInputError('Xizmatlarni ro‘yxatdan tanlang.');
  const photos = data.getAll('images');
  if (photos.length > 10) throw new VenueInputError('Ko‘pi bilan 10 ta rasm qo‘shish mumkin.');
  const uploads: { name: string; buffer: Buffer }[] = [];
  const id = `hall-${Date.now()}-${randomUUID()}`;
  let bytes = 0;
  const images: string[] = [];
  for (const [index, photo] of photos.entries()) {
    if (typeof photo === 'string') {
      let url: URL;
      try { url = new URL(photo); } catch { throw new VenueInputError('Rasm havolasini to‘g‘ri kiriting.'); }
      if (photo.length > 2000 || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new VenueInputError('Rasm havolasi http:// yoki https:// bilan boshlanishi kerak.');
      images.push(url.href);
      continue;
    }
    if (!photo.size || photo.size > 5 * 1024 * 1024) throw new VenueInputError('Har bir rasm hajmi 5 MB dan oshmasligi kerak.');
    bytes += photo.size;
    if (bytes > 30 * 1024 * 1024) throw new VenueInputError('Rasmlarning umumiy hajmi 30 MB dan oshmasligi kerak.');
    const buffer = Buffer.from(await photo.arrayBuffer());
    const extension = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
      : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? 'jpg'
      : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
    if (!extension) throw new VenueInputError('Faqat JPG, PNG yoki WebP rasmlarini yuklang.');
    const filename = `${index}.${extension}`;
    uploads.push({ name: filename, buffer });
    images.push(`/api/wedding-hall-images/${id}/${filename}`);
  }
  const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'toyxona';
  const hall: StoredVenue = {
    id, slug: `${slugName}-${id}`, name, nameUz: name, nameRu: name,
    city, cityUz: city, cityRu: city, district, districtUz: district, districtRu: district,
    address, addressUz: address, addressRu: address, description, descriptionUz: description, descriptionRu: description,
    capacity, totalPrice, pricePerPerson, currency: 'UZS', rating: 0, reviewCount: 0, bookingCount: 0,
    isVerified: false, isFeatured: false, services: services as string[], images: images.length ? images : ['/toyxona-hero.png'],
  };
  const folder = path.join(root, id);
  await mkdir(folder, { recursive: true });
  await Promise.all(uploads.map(photo => writeFile(path.join(folder, photo.name), photo.buffer, { flag: 'wx' })));
  await writeFile(path.join(folder, 'venue.tmp'), JSON.stringify(hall), { flag: 'wx' });
  await rename(path.join(folder, 'venue.tmp'), path.join(folder, 'venue.json'));
  return hall;
}

export async function setVenueVerified(slug: string, verified: boolean) {
  const hall = (await readStoredVenues()).find(venue => venue.slug === slug);
  if (!hall) return null;
  const next = { ...hall, isVerified: verified };
  const folder = path.join(root, hall.id);
  const temp = path.join(folder, `${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(next), { flag: 'wx' });
  await rename(temp, path.join(folder, 'venue.json'));
  return next;
}

export async function readVenueImage(id: string, image: string) {
  if (!isStoredVenueId(id) || !photoPattern.test(image)) return null;
  try {
    const hall = JSON.parse(await readFile(path.join(root, id, 'venue.json'), 'utf8')) as StoredVenue;
    if (!hall.images.includes(`/api/wedding-hall-images/${id}/${image}`)) return null;
    return await readFile(path.join(root, id, image));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
