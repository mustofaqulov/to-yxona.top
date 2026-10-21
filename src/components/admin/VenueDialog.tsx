'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { demoServices, demoWeddingHalls } from '@/lib/demo-data';
import { Camera, X } from 'lucide-react';
import Image from 'next/image';

export type AdminVenue = typeof demoWeddingHalls[number];

type Props = {
  venue?: AdminVenue;
  onClose: () => void;
  onCreate: (data: FormData) => Promise<string | null>;
};

export default function VenueDialog({ venue, onClose, onCreate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'nearest' }); }, [error]);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [photos, setPhotos] = useState<{ id: string; url: string; file?: File }[]>(() =>
    venue?.images.map((url, index) => ({ id: String(index), url })) ?? []);
  const [imageUrl, setImageUrl] = useState('');
  const objectUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = objectUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files);
    if (photos.length + incoming.length > 10) { setError('Ko‘pi bilan 10 ta rasm qo‘shish mumkin.'); return; }
    if (incoming.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) {
      setError('JPG, PNG yoki WebP rasm tanlang. Har bir rasm 5 MB dan oshmasin.'); return;
    }
    const totalSize = [...photos.flatMap(photo => photo.file ? [photo.file] : []), ...incoming].reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 30 * 1024 * 1024) { setError('Rasmlarning umumiy hajmi 30 MB dan oshmasligi kerak.'); return; }
    const added = incoming.map(file => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { id: crypto.randomUUID(), url, file };
    });
    setPhotos(current => [...current, ...added]);
    setError('');
  }

  function addUrl() {
    if (photos.length >= 10) { setError('Ko‘pi bilan 10 ta rasm qo‘shish mumkin.'); return; }
    try {
      const url = new URL(imageUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || imageUrl.length > 2000) throw new Error('Invalid URL');
      setPhotos(current => [...current, { id: crypto.randomUUID(), url: url.href }]);
      setImageUrl(''); setError('');
    } catch { setError('Rasm havolasi http:// yoki https:// bilan boshlanishi kerak.'); }
  }

  function removePhoto(id: string) {
    const photo = photos.find(photo => photo.id === id);
    if (photo?.file) { URL.revokeObjectURL(photo.url); objectUrls.current.delete(photo.url); }
    setPhotos(current => current.filter(photo => photo.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || venue) return;
    if (imageUrl.trim()) { setError('Rasm havolasini «Qo‘shish» tugmasi bilan qo‘shing yoki maydonni tozalang.'); return; }
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const name = text('name');
    const city = text('city');
    const district = text('district');
    const address = text('address');
    const capacity = Number(text('capacity'));
    const totalPrice = Number(text('totalPrice'));
    const personPrice = text('pricePerPerson');
    const pricePerPerson = personPrice ? Number(personPrice) : Math.max(1, Math.round(totalPrice / capacity));
    if (!name || !city || !district || !address || !Number.isInteger(capacity) || capacity < 1 || capacity > 10000 || !Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 1e12 || !Number.isFinite(pricePerPerson) || pricePerPerson <= 0 || pricePerPerson > 1e12) {
      setError('Majburiy maydonlarni va narxlarni to‘g‘ri to‘ldiring.');
      return;
    }
    photos.forEach(photo => data.append('images', photo.file || photo.url));
    submitting.current = true;
    setSaving(true); setError('');
    try {
      const result = await onCreate(data);
      if (result) setError(result);
    } catch { setError('Server bilan bog‘lanib bo‘lmadi. Kiritilgan ma’lumotlar saqlanib turibdi, qayta urinib ko‘ring.'); }
    finally { submitting.current = false; setSaving(false); }
  }

  return <dialog ref={dialogRef} className="venue-dialog" aria-labelledby="venue-dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} onClick={event => { if (!saving && event.target === event.currentTarget) onClose(); }}>
    <div className="venue-dialog-content">
      <header className="venue-dialog-header"><div><span className="eyebrow">To‘yxonalar</span><h2 id="venue-dialog-title">{venue ? 'To‘yxona ma’lumotlari' : 'To‘yxona qo‘shish'}</h2></div><button type="button" className="icon-button" aria-label="Yopish" disabled={saving} onClick={onClose}><X size={20} /></button></header>
      <p className="venue-dialog-hint">{venue ? (venue.id.startsWith('local-') ? 'Avval shu brauzerda saqlangan to‘yxona.' : 'Katalogda saqlangan to‘yxona ma’lumotlari.') : 'Manzil, narxlar va rasmlarni kiriting. Saqlangandan so‘ng to‘yxona sayt katalogida ko‘rinadi. * — majburiy maydon.'}</p>
      <form onSubmit={submit} aria-busy={saving}>
        {error && <p ref={errorRef} className="venue-form-error" role="alert">{error}</p>}
        <fieldset disabled={!!venue || saving} className="venue-form-grid">
          <label className="venue-form-wide">To‘yxona nomi *<input name="name" required maxLength={100} defaultValue={venue?.nameUz} autoFocus={!venue} placeholder="Masalan, Navro‘z saroyi" /></label>
          <label>Shahar *<input name="city" required maxLength={80} defaultValue={venue?.city || 'Qarshi'} /></label>
          <label>Tuman *<input name="district" required maxLength={80} defaultValue={venue?.district} placeholder="Tuman nomi" /></label>
          <label className="venue-form-wide">Manzil *<input name="address" required maxLength={250} defaultValue={venue?.addressUz} placeholder="Ko‘cha va uy raqami" /></label>
          <label>Sig‘imi (mehmon) *<input name="capacity" type="number" min={1} max={10000} step={1} required defaultValue={venue?.capacity} placeholder="300" /></label>
          <label>Umumiy narx (so‘m) *<input name="totalPrice" type="number" min={1} max={1e12} step={1} required defaultValue={venue?.totalPrice} placeholder="45000000" /></label>
          <label className="venue-form-wide">Bir mehmon uchun (so‘m)<input name="pricePerPerson" type="number" min={1} max={1e12} step={1} defaultValue={venue?.pricePerPerson} placeholder="Kiritilmasa umumiy narxdan hisoblanadi" /></label>
          <section className="venue-form-wide venue-photo-section" aria-labelledby="venue-photos-title">
            <div className="venue-photo-heading"><h3 id="venue-photos-title">To‘yxona rasmlari</h3><span>{photos.length} / 10</span></div>
            {!venue && <>
              <label className="venue-upload"><Camera size={28} /><strong>Rasmlarni tanlash</strong><span>JPG, PNG, WebP · har biri 5 MB gacha · jami 30 MB</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="To‘yxona rasmlarini tanlash" onChange={event => { addFiles(event.target.files); event.target.value = ''; }} /></label>
              <div className="venue-image-link"><label htmlFor="venue-image-url">Yoki rasm havolasini kiriting</label><div><input id="venue-image-url" type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} maxLength={2000} placeholder="https://..." /><button type="button" className="button button-primary" onClick={addUrl} disabled={!imageUrl.trim()}>Qo‘shish</button></div></div>
            </>}
            {photos.length > 0 && <div className="venue-photo-grid">{photos.map((photo, index) => <div key={photo.id} className="venue-photo-preview">
              <Image src={photo.url} alt={`${venue?.nameUz || 'To‘yxona'} — ${index + 1}-rasm`} width={240} height={170} unoptimized />
              <span className="venue-photo-number">{index === 0 ? 'Asosiy rasm' : `${index + 1}-rasm`}</span>
              {!venue && <div className="venue-photo-actions"><button type="button" disabled={index === 0} onClick={() => setPhotos(current => [photo, ...current.filter(item => item.id !== photo.id)])} aria-label={`${index + 1}-rasmni asosiy qilish`}>Asosiy qilish</button><button type="button" onClick={() => removePhoto(photo.id)} aria-label={`${index + 1}-rasmni olib tashlash`}><X size={15} /></button></div>}
            </div>)}</div>}
            {!venue && <p className="venue-photo-help">Birinchi rasm katalogda asosiy rasm bo‘ladi. Rasm qo‘shilmasa standart rasm ishlatiladi.</p>}
          </section>
          <label className="venue-form-wide">Tavsif<textarea name="description" rows={3} maxLength={4000} defaultValue={venue?.descriptionUz} placeholder="To‘yxona va qulayliklari haqida" /></label>
          <fieldset className="venue-form-wide venue-service-options"><legend>Xizmatlar</legend><div>{demoServices.map(service => <label key={service.id}><input type="checkbox" name="services" value={service.name} defaultChecked={venue?.services.includes(service.name)} />{service.nameUz}</label>)}</div></fieldset>
        </fieldset>
        {saving && <p role="status" className="venue-photo-help">Rasmlar yuklanmoqda va to‘yxona saqlanmoqda…</p>}
        <footer className="venue-dialog-actions"><button type="button" className="button venue-cancel" disabled={saving} onClick={onClose}>{venue ? 'Yopish' : 'Bekor qilish'}</button>{!venue && <button type="submit" disabled={saving} className="button button-primary">{saving ? 'Saqlanmoqda…' : 'To‘yxonani saqlash'}</button>}</footer>
      </form>
    </div>
  </dialog>;
}
