'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthStory from '@/components/AuthStory';
import { designCopy } from '@/lib/design-copy';
import Link from 'next/link';
import { useAppSettings } from '@/components/AppSettings';

export default function RegisterPage() {
  const { t, language } = useAppSettings();
  const copy = designCopy[language];
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage (for demo - use secure cookies in production)
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        router.push('/');
      } else {
        setError(data.error?.message || 'Registration failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="auth-shell">
        <AuthStory />
        <div className="auth-form">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            {copy.join}
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="register-fullName" className="block text-sm font-medium text-gray-700 mb-2">{t('fullName')}</label>
              <input
                type="text"
                placeholder={t('fullName')}
                id="register-fullName"
                autoComplete="name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <div>
              <label htmlFor="register-phone" className="block text-sm font-medium text-gray-700 mb-2">{t('phone')}</label>
              <input
                type="tel"
                placeholder="+998 90 123 45 67"
                id="register-phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-2">{t('password')}</label>
              <input
                type="password"
                placeholder="••••••••"
                id="register-password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                {copy.passwordHint}
              </p>
            </div>

            <div>
              <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">{t('confirmPassword')}</label>
              <input
                type="password"
                placeholder="••••••••"
                id="register-confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
            {loading ? '…' : t('register')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {copy.existing}{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700">
                {t('login')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
