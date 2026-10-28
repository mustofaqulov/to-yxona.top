import { useEffect, useState } from 'react';

export type CatalogCity = { id: string; name: string; nameUz: string; nameRu: string; region: string; districts: { id: string; name: string; nameUz: string; nameRu: string }[] };
export type CatalogService = { id: string; name: string; nameUz: string; nameRu: string; slug: string; icon: string | null };
type Catalog = { cities: CatalogCity[]; services: CatalogService[] };

const empty: Catalog = { cities: [], services: [] };
let cached: Catalog | null = null;
let pending: Promise<Catalog> | null = null;

function loadCatalog(): Promise<Catalog> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetch('/api/catalog')
    .then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Catalog failed');
      cached = result.data as Catalog;
      return cached;
    })
    .finally(() => { pending = null; });
  return pending;
}

/** Cities (with districts) and services from the database; empty until loaded. */
export function useCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(cached ?? empty);
  useEffect(() => {
    let active = true;
    loadCatalog().then(value => { if (active) setCatalog(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return catalog;
}
