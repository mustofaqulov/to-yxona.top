'use client';

import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppSettings, type Language } from '@/components/AppSettings';
import Link from 'next/link';
import { designCopy } from '@/lib/design-copy';
import { useFavorites } from '@/components/Favorites';
import HallCard from '@/components/HallCard';
import { authHeaders, clearSession, storeSessionUser, useSessionUser } from '@/lib/client-auth';
import type { BookingRequest } from '@/lib/booking-storage';

const statusLabels: Record<BookingRequest['status'], Record<Language, string>> = {
  pending: { uz: 'Kutilmoqda', ru: 'Ожидает', en: 'Pending' },
  confirmed: { uz: 'Tasdiqlangan', ru: 'Подтверждено', en: 'Confirmed' },
  rejected: { uz: 'Rad etilgan', ru: 'Отклонено', en: 'Rejected' },
  completed: { uz: 'Yakunlangan', ru: 'Завершено', en: 'Completed' },
  cancelled: { uz: 'Bekor qilingan', ru: 'Отменено', en: 'Cancelled' },
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders(), ...init?.headers } });
  const result = await response.json();
  if (!response.ok || !result.success) throw Object.assign(new Error(result.error?.message || 'Request failed'), { status: response.status });
  return result.data;
}

export default function ProfilePage() {
  const { t, language } = useAppSettings();
  const copy = designCopy[language];
  const { favorites, ready: favoritesReady } = useFavorites();
  const { user, ready } = useSessionUser();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [bookingsState, setBookingsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [review, setReview] = useState({ rating: '5', comment: '' });

  const loadBookings = useCallback(async () => {
    try {
      const data = await api('/api/bookings?limit=100');
      setBookings(data.bookings);
      setBookingsState('ready');
    } catch (error) {
      if ((error as { status?: number }).status === 401) clearSession();
      setBookingsState('error');
    }
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    // Refresh the profile from the server; an expired token signs the user out.
    let active = true;
    api('/api/auth/me').then(data => storeSessionUser(data.user)).catch(error => { if ((error as { status?: number }).status === 401) clearSession(); });
    api('/api/bookings?limit=100')
      .then(data => { if (active) { setBookings(data.bookings); setBookingsState('ready'); } })
      .catch(error => {
        if ((error as { status?: number }).status === 401) clearSession();
        if (active) setBookingsState('error');
      });
    return () => { active = false; };
  }, [userId]);

  const savedName = user?.fullName;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedName) setFullName(savedName);
  }, [savedName]);

  async function cancelBooking(id: string) {
    try {
      await api(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
      setMessage('');
      await loadBookings();
    } catch (error) { setMessage((error as Error).message); }
  }

  async function submitReview(bookingId: string) {
    try {
      await api('/api/reviews', { method: 'POST', body: JSON.stringify({ bookingId, rating: Number(review.rating), comment: review.comment }) });
      setReviewFor(null);
      setReview({ rating: '5', comment: '' });
      setMessage(language === 'uz' ? 'Sharhingiz yuborildi va tasdiqlangach e’lon qilinadi.' : language === 'ru' ? 'Отзыв отправлен и появится после модерации.' : 'Review submitted. It will appear after moderation.');
    } catch (error) { setMessage((error as Error).message); }
  }

  async function saveProfile() {
    try {
      const data = await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ fullName }) });
      storeSessionUser(data.user);
      setMessage(language === 'uz' ? 'Saqlandi.' : language === 'ru' ? 'Сохранено.' : 'Saved.');
    } catch (error) { setMessage((error as Error).message); }
  }

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('login')}
          </h1>
          <Link href="/login" className="button button-primary">{t('login')}</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const tabClass = (tab: string) => `w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="profile-shell container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('profile')}
          </h1>
          <p className="text-gray-600">
            {copy.authText}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl">{user.fullName.slice(0, 1)}</span>
                </div>
                <h2 className="text-xl font-semibold">{user.fullName}</h2>
                <p className="text-gray-600">{user.phone}</p>
              </div>

              <nav className="space-y-2">
                <button onClick={() => setActiveTab('bookings')} className={tabClass('bookings')}>{t('myBookings')}</button>
                <button onClick={() => setActiveTab('favorites')} className={tabClass('favorites')}>{t('favorites')}</button>
                <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>{t('settings')}</button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {message && <p role="status" className="mb-4 text-gray-700">{message}</p>}

            {activeTab === 'bookings' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">{t('myBookings')}</h2>
                {bookingsState === 'loading' ? <p role="status">…</p> : bookingsState === 'error' ? <p role="alert" className="text-red-700">{language === 'uz' ? 'Buyurtmalarni yuklab bo‘lmadi.' : language === 'ru' ? 'Не удалось загрузить бронирования.' : 'Unable to load bookings.'}</p> : bookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <p>{language === 'uz' ? 'Hozircha buyurtmalar yo‘q.' : language === 'ru' ? 'Бронирований пока нет.' : 'No bookings yet.'}</p>
                    <Link href="/wedding-halls" className="button button-primary mt-6">{copy.explore}</Link>
                  </div>
                ) : <ul className="space-y-4">{bookings.map(booking => (
                  <li key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex flex-wrap justify-between gap-2">
                      <Link href={`/wedding-halls/${booking.venueSlug}`} className="font-semibold">{booking.venueName}</Link>
                      <span>{statusLabels[booking.status][language]}</span>
                    </div>
                    <p className="text-gray-600">{booking.eventDate} · {booking.guestCount} · {booking.totalPrice.toLocaleString('en-US')} UZS</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(booking.status === 'pending' || booking.status === 'confirmed') && <button type="button" className="button" onClick={() => void cancelBooking(booking.id)}>{language === 'uz' ? 'Bekor qilish' : language === 'ru' ? 'Отменить' : 'Cancel'}</button>}
                      {booking.status === 'completed' && <button type="button" className="button" onClick={() => setReviewFor(reviewFor === booking.id ? null : booking.id)}>{language === 'uz' ? 'Sharh qoldirish' : language === 'ru' ? 'Оставить отзыв' : 'Write a review'}</button>}
                    </div>
                    {reviewFor === booking.id && <div className="mt-3 space-y-2">
                      <select aria-label="Rating" value={review.rating} onChange={event => setReview({ ...review, rating: event.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-black">{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{'★'.repeat(value)}</option>)}</select>
                      <textarea aria-label="Comment" rows={3} maxLength={2000} value={review.comment} onChange={event => setReview({ ...review, comment: event.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
                      <button type="button" className="button button-primary" onClick={() => void submitReview(booking.id)}>{language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : 'Submit'}</button>
                    </div>}
                  </li>
                ))}</ul>}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">{t('favorites')}</h2>
                {favoritesReady && favorites.length ? <div className="results-grid">{favorites.map(hall => <HallCard key={hall.id} hall={hall} />)}</div> : <div className="text-center py-12 text-gray-600">
                  {language === 'uz' ? 'Hozircha sevimli to‘yxonalar yo‘q.' : language === 'ru' ? 'Избранных залов пока нет.' : 'No favourite venues yet.'}
                </div>}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">{t('settings')}</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="profile-fullName" className="block text-sm font-medium text-gray-700 mb-2">{t('fullName')}</label>
                    <input id="profile-fullName" type="text" value={fullName} maxLength={100} onChange={event => setFullName(event.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" />
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-2">{t('phone')}</label>
                    <input id="profile-phone" type="tel" defaultValue={user.phone} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-black" />
                  </div>
                  <button type="button" disabled={fullName.trim().length < 2 || fullName.trim() === user.fullName} onClick={() => void saveProfile()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                    {language === 'uz' ? 'Saqlash' : language === 'ru' ? 'Сохранить' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
