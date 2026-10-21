'use client';

import Link from 'next/link';
import { useAppSettings } from './AppSettings';
import Icon from './Icon';
import { designCopy } from '@/lib/design-copy';
import { useFavorites } from './Favorites';
import { prefetchVenueDetail } from '@/lib/venue-client-cache';

export interface HallSummary {
  id: string; name: string; nameUz?: string; nameRu?: string; slug: string; city: string;
  address: string; addressUz?: string; addressRu?: string; capacity: number;
  totalPrice: number; pricePerPerson?: number | null; rating: number; reviewCount: number;
  isVerified: boolean; images: string[];
}

export default function HallCard({ hall, selectedServices = [] }: { hall: HallSummary; selectedServices?: string[] }) {
  const { language, t } = useAppSettings();
  const copy = designCopy[language];
  const { isFavorite, toggleFavorite, ready, error } = useFavorites();
  const name = language === 'uz' ? hall.nameUz || hall.name : language === 'ru' ? hall.nameRu || hall.name : hall.name;
  const price = hall.totalPrice;
  return (
    <article className="venue-card">
      <Link href={`/wedding-halls/${hall.slug}${selectedServices.length ? '?' + new URLSearchParams({ services: selectedServices.join(',') }).toString() : ''}`} className="venue-card-link" onMouseEnter={() => prefetchVenueDetail(hall.slug)} onFocus={() => prefetchVenueDetail(hall.slug)}>
      <div className="venue-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hall.images[0]} alt={name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/toyxona-hero.png'; }} />
        {hall.isVerified && <span className="verified-badge"><Icon name="check" width={14} height={14} />{t('verified')}</span>}
        <span className="venue-rating"><Icon name="star" width={12} height={12} fill="currentColor" strokeWidth={1.4} /> {hall.rating.toFixed(1)} <small>({hall.reviewCount})</small></span>
      </div>
      <div className="venue-content">
        <div className="venue-location"><Icon name="pin" width={14} height={14} />{hall.city}</div>
        <h3>{name}</h3>
        <p className="venue-capacity"><Icon name="users" width={16} height={16} /> {hall.capacity} {t('guestsUnit')}</p>
        <div className="venue-bottom"><div><strong>{price.toLocaleString('en-US')} <small>{copy.currency}</small></strong><span>{t('totalPrice')}</span></div><span className="venue-arrow"><Icon name="arrow" /></span></div>
      </div>
      </Link>
      <button type="button" className={`venue-favorite${isFavorite(hall.id) ? ' is-favorite' : ''}`} disabled={!ready} aria-pressed={isFavorite(hall.id)} aria-label={`${name}: ${isFavorite(hall.id) ? 'sevimlilardan olib tashlash' : 'sevimlilarga qo‘shish'}`} title={isFavorite(hall.id) ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'} onClick={() => toggleFavorite(hall)}><Icon name="heart" size={19} fill={isFavorite(hall.id) ? 'currentColor' : 'none'} /></button>
      {error && <p className="favorite-error" role="alert">{error}</p>}
    </article>
  );
}
