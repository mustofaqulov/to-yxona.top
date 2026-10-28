'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HallCard, { type HallSummary } from '@/components/HallCard';
import Icon from '@/components/Icon';
import Select from '@/components/Select';
import { useCatalog } from '@/lib/use-catalog';
import ServiceSelector, { parseSelectedServices } from '@/components/ServiceSelector';
import { useAppSettings } from '@/components/AppSettings';
import { designCopy } from '@/lib/design-copy';

const emptyFilters = { city: '', capacity: '', budget: '', rating: '', services: '', sortBy: 'recommended' };
export default function WeddingHallsPage() {
  return <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}><WeddingHallsContent /></Suspense>;
}
function WeddingHallsContent() {
  const params = useSearchParams();
  return <WeddingHallsResults key={params.toString()} />;
}
function WeddingHallsResults() {
  const { t, language } = useAppSettings();
  const copy = designCopy[language];
  const params = useSearchParams();
  const { cities } = useCatalog();
  const [filters, setFilters] = useState(() => Object.fromEntries(Object.entries(emptyFilters).map(([key, value]) => [key, params.get(key) || value])) as typeof emptyFilters);
  const [halls, setHalls] = useState<HallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch('/api/wedding-halls?' + new URLSearchParams(filters), { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error('Request failed');
        setHalls(data.data.halls);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filters, retry]);
  function update(key: keyof typeof emptyFilters, value: string) { setFilters(current => ({ ...current, [key]: value })); }
  return <div>
    <Navbar />
    <main className="container">
      <div className="catalogue-header"><span className="eyebrow">{copy.catalogue}</span><h1>{t('halls')}</h1><p>{copy.catalogueText}</p></div>
      <button type="button" className="button button-primary glass-button filter-toggle" aria-expanded={showFilters} aria-controls="catalogue-filters" onClick={() => setShowFilters(!showFilters)}><Icon name="search" />{t('filters')}</button>
      <div className="catalogue-layout">
        <aside id="catalogue-filters" className={'catalogue-filters' + (showFilters ? ' is-open' : '')}><div className="filter-panel">
          <div className="filter-heading"><h2>{t('filters')}</h2><button type="button" onClick={() => setFilters(emptyFilters)}>{t('clearAll')}</button></div>
          <label className="filter-field">{t('city')}<Select aria-label={t('city')} value={filters.city} onValueChange={value => update('city', value)}><option value="">{t('selectCity')}</option>{cities.map(city => <option key={city.id} value={city.name}>{language === 'uz' ? city.nameUz : language === 'ru' ? city.nameRu : city.name}</option>)}</Select></label>
          <label className="filter-field">{t('minCapacity')}<input type="text" inputMode="numeric" pattern="[0-9]*" value={filters.capacity} placeholder={copy.anyGuests} onChange={e => update('capacity', e.target.value.replace(/\D/g, ''))} /></label>
          <label className="filter-field">{t('maxBudget')}<input type="text" inputMode="numeric" pattern="[0-9]*" value={filters.budget} placeholder={copy.anyBudget} onChange={e => update('budget', e.target.value.replace(/\D/g, ''))} /></label>
          <label className="filter-field">{t('rating')}<Select aria-label={t('rating')} value={filters.rating} onValueChange={value => update('rating', value)}><option value="">{t('anyRating')}</option>{['4.5', '4', '3.5', '3'].map(value => <option key={value} value={value}>{value}+</option>)}</Select></label>
          <ServiceSelector compact value={parseSelectedServices(filters.services)} onChange={services => update('services', services.join(','))} />
        </div></aside>
        <div>
          <div className="results-toolbar"><p role="status">{loading ? '…' : halls.length + ' ' + t('hallsFound')}</p><label>{t('sortBy')}<Select aria-label={t('sortBy')} value={filters.sortBy} onValueChange={value => update('sortBy', value)}><option value="recommended">{t('recommended')}</option><option value="price-asc">{t('priceAsc')}</option><option value="price-desc">{t('priceDesc')}</option><option value="rating">{t('highestRated')}</option><option value="most-booked">{t('mostBooked')}</option><option value="newest">{t('newest')}</option></Select></label></div>
          {loading ? <div className="empty-state" aria-busy="true"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div> : failed ? <div className="empty-state" role="alert"><p>{language === 'uz' ? 'Yuklashda xatolik yuz berdi.' : language === 'ru' ? 'Не удалось загрузить залы.' : 'Unable to load venues.'}</p><button className="button button-primary glass-button" onClick={() => setRetry(retry + 1)}>{t('search')}</button></div> : halls.length === 0 ? <div className="empty-state"><p>{copy.noResults}</p><button className="button button-primary glass-button" onClick={() => setFilters(emptyFilters)}>{t('clearAll')}</button></div> : <div className="results-grid">{halls.map(hall => <HallCard key={hall.id} hall={hall} selectedServices={parseSelectedServices(filters.services)} />)}</div>}
        </div>
      </div>
    </main>
    <Footer />
  </div>;
}

