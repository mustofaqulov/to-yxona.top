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
import { useCatalog } from '@/lib/use-catalog';
import VenueDialog, { type AdminVenue } from '@/components/admin/VenueDialog';
import { authHeaders, isStaffRole, useSessionUser } from '@/lib/client-auth';
import AdminProfile, { AdminAvatar, adminProfileKey, defaultAdminProfile, isAdminProfile, type AdminProfileData } from '@/components/admin/AdminProfile';
import { foodLabel } from '@/components/FoodSelector';
import { serviceLabel } from '@/components/ServiceSelector';
import type { BookingRequest } from '@/lib/booking-storage';

type AdminTab = 'overview' | 'venues' | 'bookings' | 'services' | 'profile';
type VenueStatus = 'active' | 'pending' | 'paused';
type AdminStats = { users: number; halls: number; verifiedHalls: number; bookings: number; pendingBookings: number; revenue: number; pendingReviews: number; openComplaints: number };
const tabIcons: Record<AdminTab, LucideIcon> = { overview: Sparkles, venues: MapPin, bookings: CalendarDays, services: Heart, profile: UserRound };
const serviceIcons: Record<string, LucideIcon> = {
  Artist: MicVocal, Photographer: Camera, Videographer: Video, Catering: ChefHat,
  Host: MicVocal, DJ: Music2, Musician: Music2, Decorator: Palette, Cake: CakeSlice,
  Transport: CarFront, 'Makeup Artist': Sparkles, Clothing: Shirt,
};
export default function AdminPage() {
  const { darkMode, toggleDarkMode } = useAppSettings();
  const [tab, setTab] = useState<AdminTab>('overview');
  const { user, ready: sessionReady } = useSessionUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
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
    fetch('/api/bookings', { cache: 'no-store', signal: controller.signal, headers: authHeaders() })
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
        setServerVenues(result.data.halls as AdminVenue[]);
      })
      .catch(() => { if (!controller.signal.aborted) setNotice('Serverdagi to‘yxonalarni yuklab bo‘lmadi. Sahifani yangilang.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Platform-wide numbers are admin-only; hall owners simply see the booking-based figures.
    const controller = new AbortController();
    fetch('/api/admin/stats', { cache: 'no-store', signal: controller.signal, headers: authHeaders() })
      .then(response => response.json())
      .then(result => { if (result.success && !controller.signal.aborted) setStats(result.data as AdminStats); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [bookingReload]);

  const halls = serverVenues;
  const displayStatuses = useMemo(() => Object.fromEntries(halls.map(hall => [hall.id, hall.isVerified ? 'active' : 'pending'])) as Record<string, VenueStatus>, [halls]);

  const filteredHalls = useMemo(() => halls.filter(hall => {
    const text = `${hall.name} ${hall.nameUz} ${hall.city} ${hall.district} ${hall.address}`.toLocaleLowerCase();
    return text.includes(query.toLocaleLowerCase());
  }), [query, halls]);
  const pendingCount = halls.filter(hall => displayStatuses[hall.id] === 'pending').length;

  async function createVenue(data: FormData) {
    try {
      const response = await fetch('/api/wedding-halls', { method: 'POST', body: data, headers: authHeaders() });
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
    const hall = serverVenues.find(item => item.id === id);
    if (!hall) return;
    try {
      const response = await fetch(`/api/wedding-halls/${hall.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ isVerified: status === 'active' }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Save failed');
      setServerVenues(current => current.map(item => item.id === id ? result.data.hall : item));
      setNotice(status === 'active' ? 'To‘yxona tasdiqlandi.' : 'To‘yxona holati yangilandi.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Holatni saqlab bo‘lmadi. Qayta urinib ko‘ring.'); }
    window.setTimeout(() => setNotice(''), 2400);
  }

  async function changeBookingStatus(id: string, status: string) {
    try {
      const response = await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Save failed');
      setBookingReload(value => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Buyurtma holatini saqlab bo‘lmadi.');
      window.setTimeout(() => setNotice(''), 3200);
    }
  }

  if (sessionReady && (!user || !isStaffRole(user.role))) {
    return <div className="admin-page"><main className="admin-content"><div className="admin-panel"><h2>Kirish talab qilinadi</h2><p>Admin panel faqat administrator yoki to‘yxona egasi uchun.</p><Link href="/login" className="button button-primary">Kirish</Link></div></main></div>;
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

      {tab === 'overview' && <Overview summary={stats} totalCount={halls.length} pendingCount={pendingCount} bookings={bookings} bookingLoading={bookingLoading} bookingError={bookingError} onNavigate={setTab} />}
      {tab === 'venues' && <VenueManagement halls={filteredHalls} statuses={displayStatuses} query={query} onQuery={setQuery} onStatus={updateStatus} />}
      {tab === 'bookings' && <BookingManagement rows={bookings} loading={bookingLoading} error={bookingError} onRefresh={() => setBookingReload(value => value + 1)} onStatus={changeBookingStatus} />}
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

function Overview({ summary, totalCount, pendingCount, bookings, bookingLoading, bookingError, onNavigate }: { summary: AdminStats | null; totalCount: number; pendingCount: number; bookings: BookingRequest[]; bookingLoading: boolean; bookingError: string; onNavigate: (tab: AdminTab) => void }) {
  const stats = [
    { label: 'Jami to‘yxonalar', value: totalCount, note: 'Admin ro‘yxatida', icon: MapPin, tone: 'olive' },
    { label: 'Yangi buyurtmalar', value: summary?.pendingBookings ?? bookings.filter(item => item.status === 'pending').length, note: 'Kutilayotgan so‘rovlar', icon: CalendarDays, tone: 'terracotta' },
    { label: 'Tasdiqlangan daromad', value: summary ? summary.revenue.toLocaleString('en-US') : '—', note: 'Tasdiqlangan va yakunlangan buyurtmalar', icon: ArrowRight, tone: 'sand' },
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

function VenueManagement({ halls, statuses, query, onQuery, onStatus }: { halls: AdminVenue[]; statuses: Record<string, VenueStatus>; query: string; onQuery: (query: string) => void; onStatus: (id: string, status: VenueStatus) => void }) {
  return <section className="admin-panel">
    <div className="admin-panel-heading admin-heading-wrap"><div><span className="eyebrow">Katalog nazorati</span><h2>Barcha to‘yxonalar</h2><p>Ro‘yxatdagi maskanlarni tasdiqlang va holatini boshqaring.</p></div><label className="admin-search"><Search size={16} /><input aria-label="To‘yxona qidirish" value={query} onChange={event => onQuery(event.target.value)} placeholder="Qidirish..." /></label></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>To‘yxona</th><th>Manzil</th><th>Sig‘im</th><th>Narxlar</th><th>Reyting</th><th>Holati</th><th aria-label="Amallar" /></tr></thead><tbody>
      {halls.length === 0 && <tr><td colSpan={7}>To‘yxona topilmadi.</td></tr>}
      {halls.map(hall => {
        const status = statuses[hall.id];
        return <tr key={hall.id}>
          <td><div className="table-venue"><span className="table-venue-image"><Image src={hall.images[0]} alt="" width={42} height={36} unoptimized onError={event => { event.currentTarget.src = '/toyxona-hero.png'; }} /></span><span><strong>{hall.nameUz}</strong><small>{`${hall.images.length} ta rasm`}</small></span></div></td>
          <td>{hall.city}, {hall.district}<small className="admin-cell-note">{hall.addressUz || hall.address}</small></td><td>{hall.capacity} mehmon</td><td><strong>{hall.totalPrice.toLocaleString('en-US')} so‘m</strong><small className="admin-cell-note">{hall.pricePerPerson.toLocaleString('en-US')} so‘m / mehmon</small></td><td>{hall.reviewCount ? <><span className="rating-dot">★</span> {hall.rating}</> : '—'}</td>
          <td><span className={`status-pill ${status}`}>{status === 'active' ? 'Faol' : status === 'pending' ? 'Kutilmoqda' : 'To‘xtatilgan'}</span></td>
          <td><div className="table-actions">{status !== 'active' && <button type="button" title="Tasdiqlash" aria-label={`${hall.nameUz}: tasdiqlash`} onClick={() => onStatus(hall.id, 'active')}><Check size={16} /></button>}<Link href={`/wedding-halls/${hall.slug}`} title="Ko‘rish" aria-label="Ko‘rish"><ArrowRight size={16} /></Link></div></td>
        </tr>;
      })}
    </tbody></table></div>
  </section>;
}

function BookingManagement({ rows, loading, error, onRefresh, onStatus }: { rows: BookingRequest[]; loading: boolean; error: string; onRefresh: () => void; onStatus: (id: string, status: string) => void }) { return <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">Saqlangan so‘rovlar</span><h2>Buyurtmalar</h2><p>Mijozlar yuborgan so‘rovlar va tanlangan taomlar.</p></div><button type="button" className="button button-primary admin-export" onClick={onRefresh}>Yangilash</button></div><BookingTable rows={rows} loading={loading} error={error} onStatus={onStatus} /></section>; }

const bookingStatusLabel: Record<BookingRequest['status'], string> = { pending: 'Kutilmoqda', confirmed: 'Tasdiqlangan', rejected: 'Rad etilgan', completed: 'Yakunlangan', cancelled: 'Bekor qilingan' };
const bookingStatusTone: Record<BookingRequest['status'], string> = { pending: 'pending', confirmed: 'active', completed: 'active', rejected: 'paused', cancelled: 'paused' };

function BookingTable({ rows, loading, error, onStatus }: { rows: BookingRequest[]; loading: boolean; error: string; onStatus?: (id: string, status: string) => void }) { return <div className="admin-table-wrap"><table className="admin-table booking-table"><thead><tr><th>ID</th><th>Mijoz</th><th>To‘yxona va taomlar</th><th>Sana</th><th>Mehmonlar</th><th>To‘yxona narxi</th><th>Holati</th>{onStatus && <th aria-label="Amallar" />}</tr></thead><tbody>
  {(loading || error || rows.length === 0) && <tr><td colSpan={onStatus ? 8 : 7}>{loading ? 'Yuklanmoqda…' : error || 'Hozircha buyurtmalar yo‘q.'}</td></tr>}
  {!loading && !error && rows.map(row => <tr key={row.id}><td className="muted-cell" title={row.id}>{row.id.slice(0, 8)}</td><td><strong>{row.customerName}</strong><small className="admin-cell-note">{row.customerPhone}</small></td><td><strong>{row.venueName}</strong><small className="admin-cell-note">{row.food.length ? `Taomlar: ${row.food.map(id => foodLabel(id, 'uz')).join(', ')}` : 'Taom tanlanmagan'}</small><small className="admin-cell-note">{row.services.map(name => serviceLabel(name, 'uz')).join(', ')}</small></td><td>{row.eventDate}</td><td>{row.guestCount}</td><td><strong>{row.venuePrice.toLocaleString('en-US')} so‘m</strong><small className="admin-cell-note">Taom narxi kelishiladi</small></td><td><span className={`status-pill ${bookingStatusTone[row.status]}`}>{bookingStatusLabel[row.status]}</span></td>{onStatus && <td><div className="table-actions">{row.status === 'pending' && <><button type="button" title="Tasdiqlash" aria-label={`${row.venueName}: tasdiqlash`} onClick={() => onStatus(row.id, 'CONFIRMED')}><Check size={16} /></button><button type="button" title="Rad etish" aria-label={`${row.venueName}: rad etish`} onClick={() => onStatus(row.id, 'REJECTED')}>✕</button></>}{row.status === 'confirmed' && <><button type="button" title="Yakunlash" aria-label={`${row.venueName}: yakunlash`} onClick={() => onStatus(row.id, 'COMPLETED')}><Check size={16} /></button><button type="button" title="Bekor qilish" aria-label={`${row.venueName}: bekor qilish`} onClick={() => onStatus(row.id, 'CANCELLED')}>✕</button></>}</div></td>}</tr>)}
  </tbody></table></div>; }

function ServiceManagement() { const { services } = useCatalog(); return <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">Xizmatlar katalogi</span><h2>To‘y xizmatlari</h2><p>Saytda ko‘rsatiladigan xizmatlar va ularning holati.</p></div></div><div className="admin-service-grid">{services.map(service => { const ServiceIcon = serviceIcons[service.name] || Sparkles; return <div className="admin-service-card" key={service.id}><span><ServiceIcon size={24} strokeWidth={1.7} /></span><div><strong>{service.nameUz}</strong><small>{service.name}</small></div><span className="service-active">Faol</span></div>; })}</div></section>; }
