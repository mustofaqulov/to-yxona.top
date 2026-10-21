'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ArrowRight, CalendarDays, Camera, Check, ChefHat, Heart, MapPin,
  Moon, Music2, Plus, Search, Sparkles, Sun, UserRound, Video, CakeSlice,
  CarFront, Palette, Shirt, MicVocal, type LucideIcon,
} from 'lucide-react';
import { useAppSettings } from '@/components/AppSettings';
import { demoServices, demoWeddingHalls } from '@/lib/demo-data';
import VenueDialog, { type AdminVenue } from '@/components/admin/VenueDialog';
import { isStoredVenueId } from '@/lib/venue-id';
import AdminProfile, { AdminAvatar, adminProfileKey, defaultAdminProfile, isAdminProfile, type AdminProfileData } from '@/components/admin/AdminProfile';
import { foodLabel } from '@/components/FoodSelector';
import { serviceLabel } from '@/components/ServiceSelector';
import type { BookingRequest } from '@/lib/booking-storage';

type AdminTab = 'overview' | 'venues' | 'bookings' | 'services' | 'profile';
type VenueStatus = 'active' | 'pending' | 'paused';
const localVenuesKey = 'toyxona-admin-created-venues';

function isAdminVenue(value: unknown): value is AdminVenue {
  if (!value || typeof value !== 'object') return false;
  const hall = value as Record<string, unknown>;
  return ['id', 'slug', 'name', 'nameUz', 'nameRu', 'city', 'cityUz', 'cityRu', 'district', 'districtUz', 'districtRu', 'address', 'addressUz', 'addressRu', 'description', 'descriptionUz', 'descriptionRu', 'currency'].every(key => typeof hall[key] === 'string')
    && String(hall.id).startsWith('local-')
    && ['capacity', 'totalPrice', 'pricePerPerson', 'rating', 'reviewCount', 'bookingCount'].every(key => typeof hall[key] === 'number' && Number.isFinite(hall[key]))
    && typeof hall.isVerified === 'boolean' && typeof hall.isFeatured === 'boolean'
    && Array.isArray(hall.images) && hall.images.length > 0 && hall.images.every(image => typeof image === 'string')
    && Array.isArray(hall.services) && hall.services.every(service => typeof service === 'string');
}

const tabIcons: Record<AdminTab, LucideIcon> = { overview: Sparkles, venues: MapPin, bookings: CalendarDays, services: Heart, profile: UserRound };
const serviceIcons: Record<string, LucideIcon> = {
  Artist: MicVocal, Photographer: Camera, Videographer: Video, Catering: ChefHat,
  Host: MicVocal, DJ: Music2, Musician: Music2, Decorator: Palette, Cake: CakeSlice,
  Transport: CarFront, 'Makeup Artist': Sparkles, Clothing: Shirt,
};
function initialStatuses() {
  return Object.fromEntries(demoWeddingHalls.map((hall, index) => [hall.id, index < 3 ? 'active' : 'pending'])) as Record<string, VenueStatus>;
}

export default function AdminPage() {
  const { darkMode, toggleDarkMode } = useAppSettings();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [statuses, setStatuses] = useState<Record<string, VenueStatus>>(initialStatuses);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [localState, setLocalState] = useState<{ venues: AdminVenue[]; ready: boolean }>({ venues: [], ready: false });
  const [dialogVenue, setDialogVenue] = useState<AdminVenue | 'new' | null>(null);
  const [serverVenues, setServerVenues] = useState<AdminVenue[]>([]);
  const [adminProfile, setAdminProfile] = useState(defaultAdminProfile);
  const [profileReady, setProfileReady] = useState(false);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState('');
  const [bookingReload, setBookingReload] = useState(0);

  useEffect(() => {
    if (tab !== 'overview' && tab !== 'bookings') return;
    const controller = new AbortController();
    fetch('/api/bookings', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error('Buyurtmalarni yuklab bo‘lmadi.');
        return result.data.bookings as BookingRequest[];
      })
      .then(loaded => { if (!controller.signal.aborted) { setBookings(loaded); setBookingError(''); setBookingLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) { setBookingError('Buyurtmalarni yuklab bo‘lmadi.'); setBookingLoading(false); } });
    return () => controller.abort();
  }, [tab, bookingReload]);

  useEffect(() => {
    // Restore this browser's demo admin profile after hydration.
    try {
      const raw = localStorage.getItem(adminProfileKey);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (!isAdminProfile(stored)) throw new Error('Invalid profile');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAdminProfile(stored);
      }
    } catch { setNotice('Profilni o‘qib bo‘lmadi. Profil bo‘limida ma’lumotlarni qayta saqlashingiz mumkin.'); }
    setProfileReady(true);
  }, []);

  function saveAdminProfile(profile: AdminProfileData) {
    try {
      localStorage.setItem(adminProfileKey, JSON.stringify(profile));
      setAdminProfile(profile);
      return null;
    } catch { return 'Profil saqlanmadi. Brauzer xotirasida joy borligini tekshiring yoki kichikroq rasm tanlang.'; }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/wedding-halls?sortBy=newest', { cache: 'no-store', signal: controller.signal })
      .then(response => response.json())
      .then(result => {
        if (!result.success) throw new Error('Loading failed');
        if (controller.signal.aborted) return;
        const loaded: AdminVenue[] = result.data.halls.filter((hall: AdminVenue) => isStoredVenueId(hall.id));
        setServerVenues(current => [...current.filter(hall => isStoredVenueId(hall.id) && !loaded.some(item => item.id === hall.id)), ...loaded]);
      })
      .catch(() => { if (!controller.signal.aborted) setNotice('Serverdagi to‘yxonalarni yuklab bo‘lmadi. Sahifani yangilang.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let restored: AdminVenue[] = [];
    try {
      const raw = localStorage.getItem(localVenuesKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || !parsed.every(isAdminVenue)) throw new Error('Invalid saved venues');
      restored = parsed;
    } catch {
      // Report unavailable browser storage without replacing saved data.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice('Saqlangan to‘yxonalarni o‘qib bo‘lmadi. Brauzer xotirasini tekshiring.');
      return;
    }
    // Restore local demo records after hydration.
    setLocalState({ venues: restored, ready: true });
  }, []);

  const halls = useMemo(() => Array.from(new Map(
    [...serverVenues.filter(hall => isStoredVenueId(hall.id)), ...localState.venues, ...demoWeddingHalls].map(hall => [hall.id, hall]),
  ).values()), [serverVenues, localState.venues]);
  const displayStatuses: Record<string, VenueStatus> = { ...statuses, ...Object.fromEntries([...serverVenues.filter(hall => isStoredVenueId(hall.id)), ...localState.venues].map(hall => [hall.id, hall.isVerified ? 'active' : 'pending'])) };

  const filteredHalls = useMemo(() => halls.filter(hall => {
    const text = `${hall.name} ${hall.nameUz} ${hall.city} ${hall.district} ${hall.address}`.toLocaleLowerCase();
    return text.includes(query.toLocaleLowerCase());
  }), [query, halls]);
  const pendingCount = halls.filter(hall => displayStatuses[hall.id] === 'pending').length;

  async function createVenue(data: FormData) {
    try {
      const response = await fetch('/api/wedding-halls', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok || !result.success) return result.error?.message || 'To‘yxonani saqlab bo‘lmadi.';
      const hall: AdminVenue = result.data.hall;
      setServerVenues(current => [hall, ...current.filter(item => item.id !== hall.id)]);
      setQuery('');
      setTab('venues');
      setDialogVenue(null);
      setNotice('To‘yxona rasmlari bilan saqlandi va sayt katalogiga qo‘shildi.');
      return null;
    } catch { return 'Server bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.'; }
  }

  async function updateStatus(id: string, status: VenueStatus) {
    if (isStoredVenueId(id)) {
      const hall = serverVenues.find(hall => hall.id === id);
      if (!hall) return;
      try {
        const response = await fetch(`/api/wedding-halls/${hall.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isVerified: status === 'active' }) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error('Save failed');
        setServerVenues(current => current.map(item => item.id === id ? result.data.hall : item));
      } catch { setNotice('Holatni saqlab bo‘lmadi. Qayta urinib ko‘ring.'); return; }
    }
    if (id.startsWith('local-')) {
      try {
        const next = localState.venues.map(hall => hall.id === id ? { ...hall, isVerified: status === 'active' } : hall);
        localStorage.setItem(localVenuesKey, JSON.stringify(next));
        setLocalState({ venues: next, ready: true });
      } catch { setNotice('Holatni saqlab bo‘lmadi. Qayta urinib ko‘ring.'); return; }
    }
    setStatuses(current => ({ ...current, [id]: status }));
    setNotice(status === 'active' ? 'To‘yxona tasdiqlandi.' : 'To‘yxona holati yangilandi.');
    window.setTimeout(() => setNotice(''), 2400);
  }

  const labels: Record<AdminTab, string> = { overview: 'Umumiy ko‘rinish', venues: 'To‘yxonalar', bookings: 'Buyurtmalar', services: 'Xizmatlar', profile: 'Admin profil' };
  return <div className="admin-page">
    <aside className="admin-sidebar">
      <Link href="/" className="admin-brand"><Image src="/toyxona-logo.png" alt="" width={58} height={58} /><span>To‘yxona<span>Top</span><small>Admin workspace</small></span></Link>
      <button type="button" className="admin-user" aria-label="Admin profilini ochish" onClick={() => setTab('profile')}><AdminAvatar profile={adminProfile} /><div><strong>{adminProfile.fullName}</strong><span>Administrator</span></div></button>
      <nav className="admin-nav" aria-label="Admin navigation">
        {(Object.keys(labels) as AdminTab[]).map(item => { const TabIcon = tabIcons[item]; return <button key={item} type="button" aria-label={labels[item]} title={labels[item]} aria-pressed={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}><TabIcon size={19} strokeWidth={1.8} /><span>{labels[item]}</span>{item === 'venues' && pendingCount > 0 && <b>{pendingCount}</b>}</button>; })}
      </nav>
      <div className="admin-sidebar-bottom"><Link href="/"><ArrowLeft size={18} />Saytga qaytish</Link><button type="button" onClick={toggleDarkMode}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}{darkMode ? 'Yorug‘ rejim' : 'Tungi rejim'}</button></div>
    </aside>

    <div className="admin-workspace">
      <AdminHeader title={labels[tab]} profile={adminProfile} darkMode={darkMode} onTheme={toggleDarkMode} onProfile={() => setTab('profile')} onCreate={() => setDialogVenue('new')} />
    <main className="admin-content">
      {notice && <div className="admin-notice" role="status"><Check size={17} />{notice}</div>}

      {tab === 'overview' && <Overview totalCount={halls.length} pendingCount={pendingCount} bookings={bookings} bookingLoading={bookingLoading} bookingError={bookingError} onNavigate={setTab} />}
      {tab === 'venues' && <VenueManagement halls={filteredHalls} statuses={displayStatuses} query={query} onQuery={setQuery} onStatus={updateStatus} onPreview={setDialogVenue} />}
      {tab === 'bookings' && <BookingManagement rows={bookings} loading={bookingLoading} error={bookingError} onRefresh={() => setBookingReload(value => value + 1)} />}
      {tab === 'services' && <ServiceManagement />}
      {tab === 'profile' && (profileReady ? <AdminProfile profile={adminProfile} onSave={saveAdminProfile} /> : <p role="status">Profil yuklanmoqda…</p>)}
    </main>
    </div>
    {dialogVenue && <VenueDialog venue={dialogVenue === 'new' ? undefined : dialogVenue} onClose={() => setDialogVenue(null)} onCreate={createVenue} />}
  </div>;
}

function AdminHeader({ title, profile, darkMode, onTheme, onProfile, onCreate }: {
  title: string; profile: AdminProfileData; darkMode: boolean;
  onTheme: () => void; onProfile: () => void; onCreate: () => void;
}) {
  return <header className="admin-global-header">
    <div className="admin-header-copy"><span className="eyebrow">To‘yxona Top · Boshqaruv</span><h1>{title}</h1></div>
    <div className="admin-header-actions">
      <Link href="/" className="admin-header-site"><ArrowLeft size={16} />Saytga qaytish</Link>
      <button type="button" className="admin-header-theme" onClick={onTheme} aria-label={darkMode ? 'Yorug‘ rejim' : 'Tungi rejim'} title={darkMode ? 'Yorug‘ rejim' : 'Tungi rejim'}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
      <button type="button" className="button button-primary admin-create-venue" onClick={onCreate}><Plus size={17} />To‘yxona qo‘shish</button>
      <button type="button" className="admin-profile-trigger" aria-label="Admin profilini ochish" title={profile.fullName} onClick={onProfile}><AdminAvatar profile={profile} className="small" /></button>
    </div>
  </header>;
}

function Overview({ totalCount, pendingCount, bookings, bookingLoading, bookingError, onNavigate }: { totalCount: number; pendingCount: number; bookings: BookingRequest[]; bookingLoading: boolean; bookingError: string; onNavigate: (tab: AdminTab) => void }) {
  const stats = [
    { label: 'Jami to‘yxonalar', value: totalCount, note: 'Admin ro‘yxatida', icon: MapPin, tone: 'olive' },
    { label: 'Yangi buyurtmalar', value: bookings.length, note: 'Saqlangan so‘rovlar', icon: CalendarDays, tone: 'terracotta' },
    { label: 'Oy aylanmasi', value: '486M', note: 'Namuna ma’lumot', icon: ArrowRight, tone: 'sand' },
    { label: 'Yangi arizalar', value: pendingCount, note: 'Ko‘rib chiqish kerak', icon: Heart, tone: 'rose' },
  ];
  const chart = [38, 52, 44, 72, 60, 86, 78];
  const days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  return <>
    <section className="admin-stat-grid">{stats.map(stat => { const StatIcon = stat.icon; return <div className={`admin-stat-card ${stat.tone}`} key={stat.label}><span className="admin-stat-label">{stat.label}</span><span className="admin-stat-icon"><StatIcon size={20} strokeWidth={1.8} /></span><strong className="admin-stat-value">{stat.value}</strong><small className="admin-stat-note">{stat.note}</small></div>; })}</section>
    <section className="admin-grid-two"><div className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">Faollik · namuna</span><h2>Haftalik ko‘rsatkichlar</h2></div><span className="admin-period">7 kun</span></div><div className="admin-chart" role="group" aria-label="Namunaviy haftalik ko‘rsatkichlar">{chart.map((value, index) => <div className="chart-column" key={days[index]}><button type="button" className="chart-bar" style={{ height: `${value}%` }} aria-label={`${days[index]}: ${value} ta`}><span className="chart-tooltip" aria-hidden="true">{value} ta</span></button><span>{days[index]}</span></div>)}</div></div><div className="admin-panel admin-quick"><div className="admin-panel-heading"><div><span className="eyebrow">Tezkor amallar</span><h2>Bugun</h2></div></div><button type="button" onClick={() => onNavigate('venues')}><span><MapPin size={19} />Arizalarni ko‘rish</span><ArrowRight size={18} /></button><button type="button" onClick={() => onNavigate('bookings')}><span><CalendarDays size={19} />Buyurtmalarni boshqarish</span><ArrowRight size={18} /></button><button type="button" onClick={() => onNavigate('services')}><span><Heart size={19} />Xizmatlarni ko‘rish</span><ArrowRight size={18} /></button></div></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">So‘nggi so‘rovlar</span><h2>Buyurtmalar</h2></div><button type="button" className="text-link" onClick={() => onNavigate('bookings')}>Barchasini ko‘rish <ArrowRight size={15} /></button></div><BookingTable rows={bookings.slice(0, 3)} loading={bookingLoading} error={bookingError} /></section>
  </>;
}

function VenueManagement({ halls, statuses, query, onQuery, onStatus, onPreview }: { halls: AdminVenue[]; statuses: Record<string, VenueStatus>; query: string; onQuery: (query: string) => void; onStatus: (id: string, status: VenueStatus) => void; onPreview: (hall: AdminVenue) => void }) {
  return <section className="admin-panel">
    <div className="admin-panel-heading admin-heading-wrap"><div><span className="eyebrow">Katalog nazorati</span><h2>Barcha to‘yxonalar</h2><p>Ro‘yxatdagi maskanlarni tasdiqlang va holatini boshqaring.</p></div><label className="admin-search"><Search size={16} /><input aria-label="To‘yxona qidirish" value={query} onChange={event => onQuery(event.target.value)} placeholder="Qidirish..." /></label></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>To‘yxona</th><th>Manzil</th><th>Sig‘im</th><th>Narxlar</th><th>Reyting</th><th>Holati</th><th aria-label="Amallar" /></tr></thead><tbody>
      {halls.length === 0 && <tr><td colSpan={7}>To‘yxona topilmadi.</td></tr>}
      {halls.map(hall => {
        const status = statuses[hall.id];
        const local = hall.id.startsWith('local-');
        return <tr key={hall.id}>
          <td><div className="table-venue"><span className="table-venue-image"><Image src={hall.images[0]} alt="" width={42} height={36} unoptimized onError={event => { event.currentTarget.src = '/toyxona-hero.png'; }} /></span><span><strong>{hall.nameUz}</strong><small>{local ? 'Shu brauzerda saqlangan' : `${hall.images.length} ta rasm`}</small></span></div></td>
          <td>{hall.city}, {hall.district}<small className="admin-cell-note">{hall.addressUz || hall.address}</small></td><td>{hall.capacity} mehmon</td><td><strong>{hall.totalPrice.toLocaleString('en-US')} so‘m</strong><small className="admin-cell-note">{hall.pricePerPerson.toLocaleString('en-US')} so‘m / mehmon</small></td><td>{hall.reviewCount ? <><span className="rating-dot">★</span> {hall.rating}</> : '—'}</td>
          <td><span className={`status-pill ${status}`}>{status === 'active' ? 'Faol' : status === 'pending' ? 'Kutilmoqda' : 'To‘xtatilgan'}</span></td>
          <td><div className="table-actions">{status !== 'active' && <button type="button" title="Tasdiqlash" aria-label={`${hall.nameUz}: tasdiqlash`} onClick={() => onStatus(hall.id, 'active')}><Check size={16} /></button>}{local ? <button type="button" title="Ko‘rish" aria-label={`${hall.nameUz}: ko‘rish`} onClick={() => onPreview(hall)}><ArrowRight size={16} /></button> : <Link href={`/wedding-halls/${hall.slug}`} title="Ko‘rish" aria-label="Ko‘rish"><ArrowRight size={16} /></Link>}</div></td>
        </tr>;
      })}
    </tbody></table></div>
  </section>;
}

function BookingManagement({ rows, loading, error, onRefresh }: { rows: BookingRequest[]; loading: boolean; error: string; onRefresh: () => void }) { return <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">Saqlangan so‘rovlar</span><h2>Buyurtmalar</h2><p>Mijozlar yuborgan so‘rovlar va tanlangan taomlar.</p></div><button type="button" className="button button-primary admin-export" onClick={onRefresh}>Yangilash</button></div><BookingTable rows={rows} loading={loading} error={error} /></section>; }

function BookingTable({ rows, loading, error }: { rows: BookingRequest[]; loading: boolean; error: string }) { return <div className="admin-table-wrap"><table className="admin-table booking-table"><thead><tr><th>ID</th><th>Mijoz</th><th>To‘yxona va taomlar</th><th>Sana</th><th>Mehmonlar</th><th>To‘yxona narxi</th><th>Holati</th></tr></thead><tbody>
  {(loading || error || rows.length === 0) && <tr><td colSpan={7}>{loading ? 'Yuklanmoqda…' : error || 'Hozircha buyurtmalar yo‘q.'}</td></tr>}
  {!loading && !error && rows.map(row => <tr key={row.id}><td className="muted-cell" title={row.id}>{row.id.slice(0, 8)}</td><td><strong>{row.customerName}</strong><small className="admin-cell-note">{row.customerPhone}</small></td><td><strong>{row.venueName}</strong><small className="admin-cell-note">{row.food.length ? `Taomlar: ${row.food.map(id => foodLabel(id, 'uz')).join(', ')}` : 'Taom tanlanmagan'}</small><small className="admin-cell-note">{row.services.map(name => serviceLabel(name, 'uz')).join(', ')}</small></td><td>{row.eventDate}</td><td>{row.guestCount}</td><td><strong>{row.venuePrice.toLocaleString('en-US')} so‘m</strong><small className="admin-cell-note">Taom narxi kelishiladi</small></td><td><span className="status-pill pending">Kutilmoqda</span></td></tr>)}
  </tbody></table></div>; }

function ServiceManagement() { return <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">Xizmatlar katalogi</span><h2>To‘y xizmatlari</h2><p>Saytda ko‘rsatiladigan xizmatlar va ularning holati.</p></div><button type="button" className="button button-primary" onClick={() => window.alert('Yangi xizmat qo‘shish formasi keyingi bosqichda ulanadi.')}><Plus size={16} />Xizmat qo‘shish</button></div><div className="admin-service-grid">{demoServices.slice(0, 8).map(service => { const ServiceIcon = serviceIcons[service.name] || Sparkles; return <div className="admin-service-card" key={service.id}><span><ServiceIcon size={24} strokeWidth={1.7} /></span><div><strong>{service.nameUz}</strong><small>{service.name}</small></div><span className="service-active">Faol</span></div>; })}</div></section>; }
