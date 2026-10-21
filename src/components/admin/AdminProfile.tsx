'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Check, UserRound } from 'lucide-react';

export type AdminProfileData = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  bio: string;
  photo: string;
};

export const defaultAdminProfile: AdminProfileData = { fullName: 'Admin', phone: '', email: '', city: '', bio: '', photo: '' };
export const adminProfileKey = 'toyxona-admin-profile';

export function isAdminProfile(value: unknown): value is AdminProfileData {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  return ['fullName', 'phone', 'email', 'city', 'bio', 'photo'].every(key => typeof profile[key] === 'string')
    && String(profile.fullName).trim().length > 0 && String(profile.fullName).length <= 80
    && String(profile.phone).length <= 30 && String(profile.email).length <= 254
    && String(profile.city).length <= 80 && String(profile.bio).length <= 400
    && (profile.photo === '' || (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(profile.photo)) && String(profile.photo).length <= 1400000));
}

export function AdminAvatar({ profile, className = '' }: { profile: AdminProfileData; className?: string }) {
  const initials = profile.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A';
  return <div className={`admin-avatar ${className}`} aria-hidden="true">{profile.photo
    ? <Image src={profile.photo} alt="" width={96} height={96} unoptimized /> : initials}</div>;
}

export default function AdminProfile({ profile, onSave }: { profile: AdminProfileData; onSave: (value: AdminProfileData) => string | null }) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const changed = Object.keys(draft).some(key => draft[key as keyof AdminProfileData] !== profile[key as keyof AdminProfileData]);

  function update(key: keyof AdminProfileData, value: string) {
    setDraft(current => ({ ...current, [key]: value }));
    setSaved(false); setError('');
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    setSaved(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 1024 * 1024) {
      setError('JPG, PNG yoki WebP rasm tanlang. Rasm hajmi 1 MB dan oshmasin.'); return;
    }
    setReadingPhoto(true); setError('');
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Image read failed'));
        reader.readAsDataURL(file);
      });
      update('photo', photo);
    } catch { setError('Rasmni ochib bo‘lmadi. Boshqa rasm tanlang.'); }
    finally { setReadingPhoto(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readingPhoto) return;
    const next = { ...draft, fullName: draft.fullName.trim(), email: draft.email.trim(), phone: draft.phone.trim(), city: draft.city.trim(), bio: draft.bio.trim() };
    if (!isAdminProfile(next)) { setError('Ism va profil maydonlarini to‘g‘ri to‘ldiring.'); return; }
    if (next.phone && !/^\+?\d{7,15}$/.test(next.phone.replace(/[\s()-]/g, ''))) { setError('Telefon raqamini to‘g‘ri kiriting. Masalan: +998 90 123 45 67.'); return; }
    const failure = onSave(next);
    if (failure) { setError(failure); return; }
    setDraft(next); setError(''); setSaved(true);
  }

  return <div className="admin-profile-layout">
    <section className="admin-panel admin-profile-card" aria-label="Saqlangan admin profili">
      <AdminAvatar profile={profile} className="admin-profile-avatar" />
      <h2>{profile.fullName}</h2>
      <span className="admin-profile-role"><UserRound size={15} />Administrator</span>
      <dl>{[['Telefon', profile.phone], ['Email', profile.email], ['Shahar', profile.city]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Kiritilmagan'}</dd></div>)}</dl>
      {profile.bio && <p className="admin-profile-bio">{profile.bio}</p>}
    </section>
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><span className="eyebrow">Shaxsiy ma’lumotlar</span><h2>Profilni tahrirlash</h2><p>Profil ma’lumotlari shu brauzerda saqlanadi.</p></div></div>
      <form onSubmit={submit} className="admin-profile-form">
        {error && <p className="venue-form-error" role="alert">{error}</p>}
        {saved && <p className="admin-profile-saved" role="status"><Check size={17} />Profil saqlandi.</p>}
        <fieldset disabled={readingPhoto} className="admin-profile-fields">
          <div className="admin-profile-photo-editor"><AdminAvatar profile={draft} className="admin-profile-avatar" /><div><label htmlFor="admin-profile-photo">Profil rasmi</label><input id="admin-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} /><small>JPG, PNG yoki WebP · 1 MB gacha</small>{draft.photo && <button type="button" className="button button-primary" onClick={() => update('photo', '')}>Rasmni olib tashlash</button>}</div></div>
          <div className="admin-profile-inputs">
            <label>Ism va familiya *<input name="fullName" autoComplete="name" required maxLength={80} value={draft.fullName} onChange={event => update('fullName', event.target.value)} /></label>
            <label>Telefon<input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="+998 90 123 45 67" value={draft.phone} onChange={event => update('phone', event.target.value)} /></label>
            <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="admin@example.com" value={draft.email} onChange={event => update('email', event.target.value)} /></label>
            <label>Shahar<input name="city" autoComplete="address-level2" maxLength={80} placeholder="Qarshi" value={draft.city} onChange={event => update('city', event.target.value)} /></label>
            <label className="admin-profile-wide">O‘zingiz haqingizda<textarea name="bio" rows={4} maxLength={400} value={draft.bio} onChange={event => update('bio', event.target.value)} placeholder="Qisqacha ma’lumot" /><small>{draft.bio.length} / 400</small></label>
          </div>
        </fieldset>
        {readingPhoto && <p role="status">Rasm yuklanmoqda…</p>}
        <div className="admin-profile-actions"><button type="button" className="button venue-cancel" disabled={!changed || readingPhoto} onClick={() => { setDraft(profile); setError(''); setSaved(false); }}>Bekor qilish</button><button type="submit" className="button button-primary" disabled={!changed || readingPhoto}>O‘zgarishlarni saqlash</button></div>
      </form>
    </section>
  </div>;
}
