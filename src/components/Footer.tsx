'use client';

import Link from 'next/link';
import { useAppSettings } from './AppSettings';
import { designCopy } from '@/lib/design-copy';
import Icon from './Icon';

export default function Footer() {
  const { t, language } = useAppSettings();
  const copy = designCopy[language];
  return <footer className="site-footer" id="contact">
    <div className="container footer-grid">
      <div><Link href="/" className="brand footer-brand"><span className="brand-wordmark">To‘yxona<span>Top</span></span></Link><p>{copy.footer}</p></div>
      <div><h3>{t('halls')}</h3><Link href="/wedding-halls">{copy.all}</Link><Link href="/wedding-halls?city=Qarshi">Qarshi</Link><Link href="/#services">{t('services')}</Link></div>
      <div><h3>{copy.about}</h3><Link href="/#how-it-works">{copy.how}</Link><Link href="/login">{t('login')}</Link><Link href="/register">{t('register')}</Link></div>
      <div><h3>{copy.help}</h3><a href="mailto:info@toyxonatop.uz">info@toyxonatop.uz <Icon name="arrow" width={16} /></a><p>{copy.location}</p></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} To‘yxona Top. {copy.rights}</span><span>{copy.demo}</span></div>
  </footer>;
}

