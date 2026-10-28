import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail, handle, HttpError, ok, pageParams, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(3000),
  cityId: z.string().trim().min(1).max(64),
  districtId: z.string().trim().min(1).max(64).optional(),
  serviceIds: z.array(z.string().max(64)).min(1).max(20),
});

export const GET = handle(async (request: NextRequest) => {
  const { page, limit, skip } = pageParams(request, 20);
  const cityId = request.nextUrl.searchParams.get('cityId');
  const serviceId = request.nextUrl.searchParams.get('serviceId');
  const where: Prisma.ServiceProviderWhereInput = {
    isActive: true,
    ...(cityId ? { cityId } : {}),
    ...(serviceId ? { services: { some: { serviceId } } } : {}),
  };
  const [providers, total] = await Promise.all([
    db.serviceProvider.findMany({
      where, orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }], skip, take: limit,
      include: { city: { select: { name: true, nameUz: true, nameRu: true } }, services: { include: { service: { select: { id: true, name: true, nameUz: true, nameRu: true } } } } },
    }),
    db.serviceProvider.count({ where }),
  ]);
  return ok({ providers, total, page, limit });
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (user.role !== 'SERVICE_PROVIDER') throw new HttpError(403, 'Faqat xizmat ko‘rsatuvchi akkaunti profil yarata oladi.', 'FORBIDDEN');
  const input = createSchema.parse(await readJson(request));
  const [city, services] = await Promise.all([
    db.city.findUnique({ where: { id: input.cityId }, select: { id: true } }),
    db.service.findMany({ where: { id: { in: input.serviceIds }, isActive: true }, select: { id: true } }),
  ]);
  if (!city) throw new HttpError(400, 'Shahar topilmadi.', 'VALIDATION_ERROR');
  if (services.length !== new Set(input.serviceIds).size) throw new HttpError(400, 'Xizmatlarni ro‘yxatdan tanlang.', 'VALIDATION_ERROR');
  try {
    const provider = await db.serviceProvider.create({
      data: {
        userId: user.id, name: input.name, description: input.description, cityId: input.cityId, districtId: input.districtId,
        services: { create: services.map(service => ({ serviceId: service.id })) },
      },
    });
    return ok({ provider }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return fail('Sizda profil allaqachon mavjud.', 409, 'PROFILE_EXISTS');
    throw error;
  }
});
