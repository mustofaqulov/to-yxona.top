'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAppSettings } from './AppSettings';
import Icon from './Icon';

export default function VenueGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const { language } = useAppSettings();
  const photos = images.length ? images : ['/toyxona-hero.png'];
  const labels = language === 'ru' ? ['Фотографии', 'Предыдущее фото', 'Следующее фото', 'Показать фото']
    : language === 'en' ? ['Photos', 'Previous photo', 'Next photo', 'Show photo']
    : ['Rasmlar', 'Oldingi rasm', 'Keyingi rasm', 'Rasmni ko‘rish'];
  return <section className="hall-gallery" aria-label={labels[0]}>
    <div className="hall-gallery-main">
      <Image key={photos[active]} src={photos[active]} alt={`${name} — ${active + 1}`} fill sizes="100vw" unoptimized priority onError={event => { event.currentTarget.src = '/toyxona-hero.png'; }} />
      {photos.length > 1 && <>
        <button type="button" className="hall-gallery-prev" aria-label={labels[1]} onClick={() => setActive(current => (current - 1 + photos.length) % photos.length)}><Icon name="chevronLeft" width={24} height={24} /></button>
        <button type="button" className="hall-gallery-next" aria-label={labels[2]} onClick={() => setActive(current => (current + 1) % photos.length)}><Icon name="chevronRight" width={24} height={24} /></button>
        <span className="hall-gallery-count" aria-live="polite">{active + 1} / {photos.length}</span>
      </>}
    </div>
    {photos.length > 1 && <div className="hall-gallery-thumbnails">{photos.map((photo, index) => <button key={`${photo}-${index}`} type="button" aria-label={`${labels[3]} ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)}>
      <Image src={photo} alt="" width={120} height={80} unoptimized />
    </button>)}</div>}
  </section>;
}
