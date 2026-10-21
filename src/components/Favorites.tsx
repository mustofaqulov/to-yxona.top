'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteHall[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || !parsed.every(isFavoriteHall)) throw new Error('Invalid favorites');
      // Restore browser data after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFavorites(parsed);
    } catch { setError('Sevimlilarni o‘qib bo‘lmadi. Brauzer xotirasini tekshiring.'); }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      try {
        const parsed: unknown = event.newValue ? JSON.parse(event.newValue) : [];
        if (Array.isArray(parsed) && parsed.every(isFavoriteHall)) { setFavorites(parsed); setError(''); }
      } catch { setError('Sevimlilarni yangilab bo‘lmadi.'); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function toggleFavorite(hall: FavoriteHall) {
    if (!ready) return;
    const next = favorites.some(item => item.id === hall.id)
      ? favorites.filter(item => item.id !== hall.id)
      : [hall, ...favorites];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setFavorites(next);
      setError('');
    } catch { setError('Sevimlilarni saqlab bo‘lmadi. Brauzer xotirasini tekshiring.'); }
  }

  return <FavoritesContext.Provider value={{ favorites, ready, error, isFavorite: id => favorites.some(hall => hall.id === id), toggleFavorite }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('FavoritesProvider is missing');
  return context;
}
