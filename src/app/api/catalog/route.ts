import { db } from '@/lib/db';
import { handle, ok } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Reference data for search filters and forms: cities (with districts) and services. */
export const GET = handle(async () => {
  const [cities, services] = await Promise.all([
    db.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, nameUz: true, nameRu: true, region: true, districts: { where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, nameUz: true, nameRu: true } } },
    }),
    db.service.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, nameUz: true, nameRu: true, slug: true, icon: true } }),
  ]);
  return ok({ cities, services });
});
