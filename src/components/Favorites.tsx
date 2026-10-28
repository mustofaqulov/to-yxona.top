'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authHeaders, useSessionUser } from '@/lib/client-auth';

export type FavoriteHall = {
  id: string; slug: string; name: string; nameUz?: string; nameRu?: string;
  city: string; address: string; capacity: number; totalPrice: number;
  pricePerPerson?: number | null; rating: number; reviewCount: number;
  isVerified: boolean; images: string[];
};

const storageKey = 'toyxona-favorite-halls';
type FavoritesValue = {
  favorites: FavoriteHall[];
  ready: boolean;
  error: string;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (hall: FavoriteHall) => void;
};
const FavoritesContext = createContext<FavoritesValue | null>(null);

function isFavoriteHall(value: unknown): value is FavoriteHall {
  if (!value || typeof value !== 'object') return false;
  const hall = value as Record<string, unknown>;
  return typeof hall.id === 'string' && typeof hall.slug === 'string'
    && typeof hall.name === 'string' && typeof hall.city === 'string'
    && typeof hall.address === 'string' && typeof hall.capacity === 'number'
    && typeof hall.totalPrice === 'number' && typeof hall.rating === 'number'
    && typeof hall.reviewCount === 'number' && typeof hall.isVerified === 'boolean'
    && Array.isArray(hall.images) && hall.images.length > 0 && hall.images.every(image => typeof image === 'string');
}

function readLocalFavorites(): FavoriteHall[] {
  const raw = localStorage.getItem(storageKey);
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed) || !parsed.every(isFavoriteHall)) throw new Error('Invalid favorites');
  return parsed;
}

async function request(method: 'GET' | 'POST' | 'DELETE', hallId?: string) {
  const response = await fetch('/api/favorites', {
    method,
    headers: { ...authHeaders(), ...(hallId ? { 'Content-Type': 'application/json' } : {}) },
    body: hallId ? JSON.stringify({ hallId }) : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error?.message || 'Favorites request failed');
  return result.data;
}

/** Signed-in users keep favorites on the server; guests keep them in this browser. */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: sessionReady } = useSessionUser();
  const userId = user?.id ?? null;
  const [favorites, setFavorites] = useState<FavoriteHall[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionReady) return;
    let active = true;
    async function load() {
      if (!userId) {
        try { if (active) { setFavorites(readLocalFavorites()); setError(''); } }
        catch { if (active) setError('Sevimlilarni o‘qib bo‘lmadi. Brauzer xotirasini tekshiring.'); }
        if (active) setReady(true);
        return;
      }
      try {
        let halls: FavoriteHall[] = (await request('GET')).halls;
        // Move favorites saved while signed out to the account, once.
        let local: FavoriteHall[] = [];
        try { local = readLocalFavorites(); } catch { local = []; }
        const missing = local.filter(item => !halls.some(hall => hall.id === item.id));
        if (missing.length) {
          await Promise.allSettled(missing.map(item => request('POST', item.id)));
          halls = (await request('GET')).halls;
        }
        try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
        if (active) { setFavorites(halls); setError(''); }
      } catch {
        if (active) setError('Sevimlilarni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
      }
      if (active) setReady(true);
    }
    void load();
    return () => { active = false; };
  }, [userId, sessionReady]);

  async function toggleFavorite(hall: FavoriteHall) {
    if (!ready) return;
    const exists = favorites.some(item => item.id === hall.id);
    const next = exists ? favorites.filter(item => item.id !== hall.id) : [hall, ...favorites];
    const previous = favorites;
    setFavorites(next);
    setError('');
    try {
      if (userId) await request(exists ? 'DELETE' : 'POST', hall.id);
      else localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setFavorites(previous);
      setError('Sevimlilarni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    }
  }

  return <FavoritesContext.Provider value={{ favorites, ready, error, isFavorite: id => favorites.some(hall => hall.id === id), toggleFavorite: hall => { void toggleFavorite(hall); } }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('FavoritesProvider is missing');
  return context;
}
