'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppSettings } from '@/components/AppSettings';
import type { User } from '@/lib/auth';
import Link from 'next/link';
import { designCopy } from '@/lib/design-copy';
import { useFavorites } from '@/components/Favorites';
import HallCard from '@/components/HallCard';

export default function ProfilePage() {
  const { t, language } = useAppSettings();
  const copy = designCopy[language];
  const { favorites, ready: favoritesReady } = useFavorites();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('bookings');

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      // Restore browser-only profile data after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(userData));
    }
  }, []);

  if (!user) {
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
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'bookings'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {t('myBookings')}
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'favorites'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {t('favorites')}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {t('settings')}
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {activeTab === 'bookings' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">{t('myBookings')}</h2>
                <div className="text-center py-12 text-gray-600">
                  <p>{language === 'uz' ? 'Hozircha buyurtmalar yo‘q.' : language === 'ru' ? 'Бронирований пока нет.' : 'No bookings yet.'}</p>
                  <Link href="/wedding-halls" className="button button-primary mt-6">{copy.explore}</Link>
                </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('fullName')}
                    </label>
                    <input
                      type="text"
                      defaultValue={user.fullName}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('phone')}
                    </label>
                    <input
                      type="tel"
                      defaultValue={user.phone}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-black"
                    />
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
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
