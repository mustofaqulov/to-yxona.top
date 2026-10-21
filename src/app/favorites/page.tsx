'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HallCard from '@/components/HallCard';
import { useFavorites } from '@/components/Favorites';
import { useAppSettings } from '@/components/AppSettings';

export default function FavoritesPage() {
  const { favorites, ready, error } = useFavorites();
  const { language, t } = useAppSettings();
  const empty = language === 'ru' ? 'Избранных залов пока нет.' : language === 'en' ? 'No favourite venues yet.' : 'Hozircha sevimli to‘yxonalar yo‘q.';
  return <div><Navbar /><main className="container favorites-page"><span className="eyebrow">To‘yxona Top</span><h1>{t('favorites')}</h1>
    {error && <p role="alert" className="favorite-error">{error}</p>}
    {!ready ? <p role="status">…</p> : favorites.length ? <div className="results-grid">{favorites.map(hall => <HallCard key={hall.id} hall={hall} />)}</div>
      : <div className="empty-state"><p>{empty}</p><Link href="/wedding-halls" className="button button-primary">{t('halls')}</Link></div>}
  </main><Footer /></div>;
}
