import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { demoCities, demoReviews, demoServices, demoWeddingHalls } from '../src/lib/demo-data';

// Idempotent: safe to run repeatedly. Admin credentials come from SEED_ADMIN_PHONE / SEED_ADMIN_PASSWORD.
const db = new PrismaClient();
const ROUNDS = 12;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function seedServices() {
  for (const service of demoServices) {
    const data = { name: service.name, nameUz: service.nameUz, nameRu: service.nameRu, icon: service.icon };
    await db.service.upsert({ where: { slug: slugify(service.name) }, create: { slug: slugify(service.name), ...data }, update: data });
  }
}

async function seedCities() {
  for (const city of demoCities) {
    const existing = await db.city.findFirst({ where: { name: city.name } });
    if (!existing) {
      await db.city.create({ data: { name: city.name, nameUz: city.nameUz, nameRu: city.nameRu, region: city.region, regionUz: city.region, regionRu: city.region } });
    }
  }
}

async function ensureLocation(hall: (typeof demoWeddingHalls)[number]) {
  const city = await db.city.findFirst({ where: { name: hall.city } })
    ?? await db.city.create({ data: { name: hall.city, nameUz: hall.cityUz, nameRu: hall.cityRu, region: hall.city, regionUz: hall.cityUz, regionRu: hall.cityRu } });
  const district = await db.district.findFirst({ where: { cityId: city.id, name: hall.district } })
    ?? await db.district.create({ data: { name: hall.district, nameUz: hall.districtUz, nameRu: hall.districtRu, cityId: city.id } });
  return { city, district };
}

async function seedUsers() {
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? '+998900000000';
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const generated = !adminPassword;
  if (!adminPassword) adminPassword = randomBytes(9).toString('base64url');

  const admin = await db.user.upsert({
    where: { phone: adminPhone },
    create: { phone: adminPhone, fullName: 'Administrator', role: 'ADMIN', isAdmin: true, adminRole: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(adminPassword, ROUNDS) },
    update: {},
  });
  if (generated) console.log(`Admin ${adminPhone} password (shown once): ${adminPassword}`);

  // Demo owner and customers cannot log in: their passwords are random and never shown.
  const unusable = () => bcrypt.hash(randomBytes(24).toString('hex'), ROUNDS);
  const owner = await db.user.upsert({
    where: { phone: '+998900000001' },
    create: { phone: '+998900000001', fullName: 'Demo Owner', role: 'WEDDING_HALL_OWNER', passwordHash: await unusable() },
    update: {},
  });
  return { admin, owner };
}

async function seedHalls(ownerId: string) {
  const services = new Map((await db.service.findMany()).map(service => [service.name, service.id]));
  for (const hall of demoWeddingHalls) {
    if (await db.weddingHall.findUnique({ where: { id: hall.id }, select: { id: true } })) continue;
    const { city, district } = await ensureLocation(hall);
    await db.weddingHall.create({
      data: {
        id: hall.id, slug: hall.slug, ownerId, cityId: city.id, districtId: district.id,
        name: hall.name, nameUz: hall.nameUz, nameRu: hall.nameRu,
        description: hall.description, descriptionUz: hall.descriptionUz, descriptionRu: hall.descriptionRu,
        address: hall.address, addressUz: hall.addressUz, addressRu: hall.addressRu,
        capacity: hall.capacity, pricePerPerson: hall.pricePerPerson, totalPrice: hall.totalPrice, currency: hall.currency,
        rating: hall.rating, reviewCount: hall.reviewCount, bookingCount: hall.bookingCount,
        isVerified: hall.isVerified, verificationStatus: hall.isVerified ? 'VERIFIED' : 'PENDING', isFeatured: hall.isFeatured,
        images: { create: hall.images.map((imageUrl, order) => ({ imageUrl, order, isMain: order === 0 })) },
        services: { create: hall.services.flatMap(name => (services.get(name) ? [{ serviceId: services.get(name)! }] : [])) },
      },
    });
  }
}

async function seedReviews() {
  for (const [index, review] of demoReviews.entries()) {
    if (await db.review.findFirst({ where: { comment: review.comment } })) continue;
    const phone = `+99890000010${index}`;
    const user = await db.user.upsert({
      where: { phone }, update: {},
      create: { phone, fullName: review.userName, passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), ROUNDS) },
    });
    const hall = await db.weddingHall.findUnique({ where: { id: review.weddingHallId } });
    if (!hall) continue;
    const date = new Date(`${review.date}T00:00:00.000Z`);
    const booking = await db.booking.create({
      data: { userId: user.id, weddingHallId: hall.id, date, guestCount: 100, budget: hall.totalPrice, totalPrice: hall.totalPrice, status: 'COMPLETED', completedAt: date, contactName: user.fullName, contactPhone: user.phone },
    });
    await db.review.create({ data: { userId: user.id, weddingHallId: hall.id, bookingId: booking.id, rating: review.rating, comment: review.comment, isApproved: true, isVerified: true, createdAt: date } });
  }
}

async function main() {
  await seedServices();
  await seedCities();
  const { owner } = await seedUsers();
  await seedHalls(owner.id);
  await seedReviews();
  console.log('Seed complete.');
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
