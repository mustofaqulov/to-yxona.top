'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HallCard from '@/components/HallCard';
import Icon from '@/components/Icon';
import ServiceSelector, { serviceSelectionCopy } from '@/components/ServiceSelector';
import Select from '@/components/Select';
import DatePicker from '@/components/DatePicker';
import { useAppSettings } from '@/components/AppSettings';
import { demoWeddingHalls, demoCities } from '@/lib/demo-data';
import { designCopy } from '@/lib/design-copy';

export default function Home() {
  const { t, language } = useAppSettings();
  const copy = designCopy[language];
  const router = useRouter();
  const [search, setSearch] = useState({ city: '', date: '', guests: '', budget: '' });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  function searchUrl() {
    const params = new URLSearchParams();
    if (search.city) params.set('city', search.city);
    if (search.date) params.set('date', search.date);
    if (search.guests) params.set('capacity', search.guests);
    if (search.budget) params.set('budget', search.budget);
    if (selectedServices.length) params.set('services', selectedServices.join(','));
    return '/wedding-halls?' + params.toString();
  }
  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(searchUrl());
  }
  return <div className="home-page">
    <Navbar />
    <main>
      <section className="hero-section container">
        <div className="hero-copy">
          <span className="eyebrow"><span className="little-star">✳</span>{copy.eyebrow}</span>
          <h1>{copy.heroTitle}<br /><em>{copy.heroAccent}</em></h1>
          <p>{copy.heroText}</p>
          <div className="hero-actions"><Link href="/wedding-halls" className="button button-primary">{copy.explore}<Icon name="arrow" /></Link><a href="#how-it-works" className="text-link">{copy.how}</a></div>
          <div className="hero-note"><span className="note-icon"><Icon name="heart" /></span><span>{copy.photoCaption}</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/toyxona-hero.png" alt={language === 'uz' ? 'To‘y uchun bezatilgan nafis ziyofat zali' : language === 'ru' ? 'Красиво оформленный свадебный зал' : 'An elegantly decorated wedding venue'} fetchPriority="high" />
            <div className="photo-location"><Icon name="pin" width={16} />{copy.location}</div>
          </div>
          <span className="hero-stamp" aria-hidden="true"><Icon name="flower" width={32} height={32} /><span>To‘yxona<br />Top</span></span>
          <div className="photo-caption"><span>To‘yxona Top</span><span>{copy.photoCaption}</span></div>
        </div>
      </section>
      <section className="container search-section" aria-label={copy.searchTitle}>
        <form onSubmit={handleSearch} className="search-panel">
          <label><span><Icon name="pin" width={16} />{t('city')}</span><Select aria-label={t('city')} value={search.city} onValueChange={value => setSearch({ ...search, city: value })}><option value="">{t('selectCity')}</option>{demoCities.map(city => <option key={city.id} value={city.name}>{language === 'uz' ? city.nameUz : language === 'ru' ? city.nameRu : city.name}</option>)}</Select></label>
          <label><span><Icon name="calendar" width={16} />{t('weddingDate')}</span><DatePicker aria-label={t('weddingDate')} value={search.date} onValueChange={value => setSearch({ ...search, date: value })} /></label>
          <label><span><Icon name="users" width={16} />{t('guests')}</span><input type="text" inputMode="numeric" pattern="[0-9]*" placeholder={copy.anyGuests} value={search.guests} onChange={e => setSearch({ ...search, guests: e.target.value.replace(/\D/g, '') })} /></label>
          <label><span>{t('budget')}</span><input type="text" inputMode="numeric" pattern="[0-9]*" placeholder={copy.anyBudget} value={search.budget} onChange={e => setSearch({ ...search, budget: e.target.value.replace(/\D/g, '') })} /></label>
          <button type="submit" className="button button-primary glass-button"><Icon name="search" width={16} height={16} />{t('search')}</button>
        </form>
      </section>
      <section className="collection-section container">
        <div className="section-heading"><div><span className="eyebrow">{copy.collection}</span><h2>{copy.popular}</h2><p>{copy.popularText}</p></div><Link href="/wedding-halls" className="text-link">{copy.all}<Icon name="arrow" /></Link></div>
        <div className="venue-grid">{demoWeddingHalls.slice(0, 3).map(hall => <HallCard key={hall.id} hall={hall} />)}</div>
      </section>
      <section className="services-section" id="services"><div className="container">
        <div className="section-heading"><div><span className="eyebrow">{t('services')}</span><h2>{copy.servicesTitle}</h2><p>{copy.servicesText}</p></div><span className="section-decoration" aria-hidden="true">✳</span></div>
        <ServiceSelector value={selectedServices} onChange={setSelectedServices} />
        <div className="service-search-action"><button type="button" className="button button-primary" onClick={() => router.push(searchUrl())}>{serviceSelectionCopy[language].find}<Icon name="arrow" /></button></div>
      </div></section>
      <section className="steps-section container" id="how-it-works">
        <div className="section-heading"><div><span className="eyebrow">{copy.how}</span><h2>{copy.stepsTitle}</h2></div></div>
        <div className="steps-grid">{copy.stepNames.map((name, i) => <div className="step" key={name}><span className="step-number">0{i + 1}</span><h3>{name}</h3><p>{copy.stepTexts[i]}</p></div>)}</div>
      </section>
      <section className="container"><div className="closing-banner"><div><span className="eyebrow">To‘yxona Top</span><h2>{copy.cta}</h2><p>{copy.ctaText}</p></div><Link href="/wedding-halls" className="button button-terra">{copy.explore}<Icon name="arrow" /></Link></div></section>
    </main>
    <Footer />
  </div>;
}

