'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAppSettings, type Language } from './AppSettings';
import Select from './Select';
import Icon from './Icon';
import { designCopy } from '@/lib/design-copy';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, darkMode, toggleDarkMode, t } = useAppSettings();
  const copy = designCopy[language];
  const path = usePathname();
  const links = [
    { href: '/', label: t('home') },
    { href: '/wedding-halls', label: t('halls') },
    { href: '/favorites', label: t('favorites') },
    { href: '/#services', label: t('services') },
    { href: '/#how-it-works', label: copy.how },
  ];
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="To'yxona Top">
          <Image src="/toyxona-logo.png" alt="" width={88} height={88} loading="eager" className="brand-logo" />
          <span className="brand-wordmark">To‘yxona<span>Top</span><small>{copy.location}</small></span>
        </Link>
        <nav className="desktop-nav" aria-label={copy.menu}>
          {links.map(link => <Link key={link.href} href={link.href} className={path === link.href ? 'active' : ''} aria-current={path === link.href ? 'page' : undefined}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Select aria-label={copy.language} value={language} onValueChange={value => setLanguage(value as Language)} className="language-select">
            <option value="uz">UZ</option><option value="en">ENG</option><option value="ru">RU</option>
          </Select>
          <button className="icon-button theme-toggle" type="button" onClick={toggleDarkMode} aria-label={darkMode ? copy.light : copy.dark}><Icon name={darkMode ? 'sun' : 'moon'} /></button>
          <Link href="/login" className="button button-primary header-login">{t('login')}<Icon name="arrow" width={16} /></Link>
          <button className="icon-button mobile-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label={copy.menu}><Icon name={open ? 'close' : 'menu'} /></button>
        </div>
      </div>
      {open && <nav id="mobile-menu" className="mobile-nav" aria-label={copy.menu}>
        {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
        <Link href="/login" onClick={() => setOpen(false)}>{t('login')}</Link>
        <Link href="/register" onClick={() => setOpen(false)}>{t('register')}</Link>
      </nav>}
    </header>
  );
}

