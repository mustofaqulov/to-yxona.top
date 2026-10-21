'use client';

import DatePicker, { dateValue } from '@/components/DatePicker';
import VenueGallery from '@/components/VenueGallery';
import Icon from '@/components/Icon';
import ServiceSelector, { parseSelectedServices, serviceLabel, serviceSelectionCopy } from '@/components/ServiceSelector';
import FoodSelector, { foodLabel, foodSelectionCopy } from '@/components/FoodSelector';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useAppSettings } from '@/components/AppSettings';
import { useFavorites } from '@/components/Favorites';
import { getVenueDetail } from '@/lib/venue-client-cache';

interface WeddingHall {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  district: string;
  capacity: number;
  pricePerPerson: number | null;
  totalPrice: number;
  currency: string;
  rating: number;
  reviewCount: number;
  bookingCount: number;
  isVerified: boolean;
  images: string[];
  services: string[];
  nameUz?: string;
  nameRu?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  addressUz?: string;
  addressRu?: string;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  commentUz?: string;
  commentRu?: string;
  date: string;
}

interface Availability {
  date: string;
  status: 'available' | 'pending' | 'booked';
}

const bookingCopy = {
  uz: { note: 'So‘rov saqlanadi va ko‘rib chiqilishini kutadi. Taom narxini to‘yxona bilan kelishing.', success: 'Band qilish so‘rovi saqlandi. Raqami:', sending: 'Yuborilmoqda...' },
  en: { note: 'Your request will be saved as pending. Confirm food pricing with the venue.', success: 'Booking request saved. Reference:', sending: 'Sending...' },
  ru: { note: 'Заявка будет сохранена в ожидании. Стоимость блюд уточните у зала.', success: 'Заявка сохранена. Номер:', sending: 'Отправка...' },
} as const;

export default function WeddingHallDetailPage() {
  return <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}><WeddingHallRoute /></Suspense>;
}

function WeddingHallRoute() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  return <WeddingHallDetailContent key={`${slug}:${searchParams.toString()}`} slug={slug} initialServices={parseSelectedServices(searchParams.get('services'))} />;
}

function WeddingHallDetailContent({ slug, initialServices }: { slug: string; initialServices: string[] }) {
  const { language, t } = useAppSettings();
  const serviceCopy = serviceSelectionCopy[language];
  const { isFavorite, toggleFavorite, ready: favoritesReady } = useFavorites();
  
  const [hall, setHall] = useState<WeddingHall | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedServices, setSelectedServices] = useState(initialServices);
  const [selectedFood, setSelectedFood] = useState<string[]>([]);
  const availableSelection = selectedServices.filter(name => hall?.services.includes(name));
  const foodCopy = foodSelectionCopy[language];
  const requestCopy = bookingCopy[language];
  const hasCatering = hall?.services.includes('Catering') ?? false;

  const handleServiceChange = (services: string[]) => {
    setSelectedServices(services);
    if (!services.includes('Catering')) setSelectedFood([]);
  };

  const handleFoodChange = (food: string[]) => {
    setSelectedFood(food);
    if (food.length && !availableSelection.includes('Catering')) setSelectedServices([...availableSelection, 'Catering']);
  };

  useEffect(() => {
    let active = true;
    async function loadWeddingHall() {
      setLoading(true);
      try {
        const data = await getVenueDetail<{ success: boolean; data: { hall: WeddingHall; reviews: Review[]; availability: Availability[] } }>(slug);
        if (!active) return;
        if (data.success) {
          setHall(data.data.hall);
          setReviews(data.data.reviews);
          setAvailability(data.data.availability);
        } else {
          setHall(null);
        }
      } catch (error) {
        if (!active) return;
        console.error('Error fetching wedding hall:', error);
        setHall(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadWeddingHall();
    return () => { active = false; };
  }, [slug]);

  const handleBooking = () => {
    if (!selectedDate || !guestCount || !Number.isSafeInteger(Number(guestCount)) || Number(guestCount) < 1 || Number(guestCount) > (hall?.capacity ?? 0)) {
      alert(language === 'uz' ? 'Sanani tanlang va mehmonlar sonini kiriting' : language === 'ru' ? 'Выберите дату и укажите количество гостей' : 'Please select a date and enter the number of guests');
      return;
    }
    setBookingError('');
    setShowBookingModal(true);
  };

  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hall || submitting) return;
    setSubmitting(true);
    setBookingError('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueSlug: hall.slug, eventDate: selectedDate, guestCount: Number(guestCount), customerName, customerPhone, services: availableSelection, food: selectedFood }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Buyurtmani yuborib bo‘lmadi.');
      setBookingSuccess(result.data.id);
      setShowBookingModal(false);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Buyurtmani yuborib bo‘lmadi.');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'booked':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!hall) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('hallNotFound')}
          </h1>
          <Link
            href="/wedding-halls"
            className="text-blue-600 hover:text-blue-700"
          >
            {t('backToHalls')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="detail-main container">
        <h2 className="mb-5 text-sm font-semibold tracking-[0.18em] text-blue-600">{t('fullDetails')}</h2>
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">{t('home')}</Link>
          {' / '}
          <Link href="/wedding-halls" className="hover:text-blue-600">{t('halls')}</Link>
          {' / '}
          <span className="text-gray-900">{language === 'uz' ? hall.nameUz || hall.name : language === 'ru' ? hall.nameRu || hall.name : hall.name}</span>
        </div>

        {/* Gallery */}
        <VenueGallery key={hall.id} images={hall.images} name={language === 'uz' ? hall.nameUz || hall.name : language === 'ru' ? hall.nameRu || hall.name : hall.name} />

        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {language === 'uz' ? hall.nameUz || hall.name : language === 'ru' ? hall.nameRu || hall.name : hall.name}
                </h1>
                <p className="text-gray-600">{language === 'uz' ? hall.addressUz || hall.address : language === 'ru' ? hall.addressRu || hall.address : hall.address}</p>
              </div>
              <button type="button" className={`detail-favorite${isFavorite(hall.id) ? ' is-favorite' : ''}`} disabled={!favoritesReady} aria-pressed={isFavorite(hall.id)} onClick={() => toggleFavorite(hall)}><Icon name="heart" size={18} fill={isFavorite(hall.id) ? 'currentColor' : 'none'} />{language === 'ru' ? (isFavorite(hall.id) ? 'Убрать из избранного' : 'В избранное') : language === 'en' ? (isFavorite(hall.id) ? 'Remove from favorites' : 'Add to favorites') : (isFavorite(hall.id) ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish')}</button>
              {hall.isVerified && (
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5">
                  <Icon name="verified" width={16} height={16} /> {t('verified')}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6 mb-6">
              <div className="flex items-center space-x-2">
                <Icon name="star" className="text-yellow-500" width={24} height={24} fill="currentColor" strokeWidth={1.4} />
                <span className="text-2xl font-bold">{hall.rating}</span>
                <span className="text-gray-500">({hall.reviewCount} {t('reviews')})</span>
              </div>
              <div className="text-gray-500">
                {hall.bookingCount} {t('bookings')}
              </div>
            </div>

            <div className="prose max-w-none mb-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{t('description')}</h2>
              <p className="text-gray-700">{language === 'uz' ? hall.descriptionUz || hall.description : language === 'ru' ? hall.descriptionRu || hall.description : hall.description}</p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t('capacityLabel')}</div>
                <div className="font-semibold">{hall.capacity} {t('guestsUnit')}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t('city')}</div>
                <div className="font-semibold">{hall.city}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t('district')}</div>
                <div className="font-semibold">{hall.district}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t('price')}</div>
                <div className="font-semibold">
                  {hall.pricePerPerson 
                    ? `${hall.pricePerPerson.toLocaleString('en-US')} UZS`
                    : `${hall.totalPrice.toLocaleString('en-US')} UZS`
                  }
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="mb-6" id="venue-services">
              <ServiceSelector available={hall.services} value={availableSelection} onChange={handleServiceChange} />
              <p className="service-selector-hint">{serviceCopy.priceNote}</p>
            </div>

            {hasCatering && <div className="mb-6" id="venue-food">
              <FoodSelector value={selectedFood} onChange={handleFoodChange} />
            </div>}

            {/* Reviews */}
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('reviewsTitle')}</h2>
              {reviews.length === 0 ? (
                <p className="text-gray-600">{t('noReviews')}</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{review.userName}</div>
                        <div className="flex items-center space-x-2">
                          <Icon name="star" className="text-yellow-500" width={16} height={16} fill="currentColor" strokeWidth={1.4} />
                          <span>{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-gray-700">{language === 'uz' ? review.commentUz || review.comment : language === 'ru' ? review.commentRu || review.comment : review.comment}</p>
                      <div className="text-sm text-gray-500 mt-2">{review.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('location')}</h2>
              <p className="mb-5 text-sm text-gray-600">{hall.city}, {hall.district}<br />{language === 'uz' ? hall.addressUz || hall.address : language === 'ru' ? hall.addressRu || hall.address : hall.address}</p>
              <div className="mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {hall.totalPrice.toLocaleString('en-US')} UZS
                </div>
                <div className="text-gray-600">{t('totalPrice')}</div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('selectDate')}
                </label>
                <DatePicker
                  aria-label={t('selectDate')}
                  min={dateValue(new Date())}
                  value={selectedDate}
                  onValueChange={setSelectedDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('guests')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={`Max ${hall.capacity}`}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div className="booking-service-summary">
                <strong>{serviceCopy.selected}</strong>
                {availableSelection.length ? <ul>{availableSelection.map(name => <li key={name}>{serviceLabel(name, language)}</li>)}</ul> : <p>{serviceCopy.empty}</p>}
                <a href="#venue-services" className="text-link">{serviceCopy.choose}</a>
              </div>

              {hasCatering && <div className="booking-service-summary">
                <strong>{foodCopy.selected}</strong>
                {selectedFood.length ? <ul>{selectedFood.map(id => <li key={id}>{foodLabel(id, language)}</li>)}</ul> : <p>{foodCopy.empty}</p>}
                <a href="#venue-food" className="text-link">{foodCopy.title}</a>
              </div>}

              <button
                onClick={handleBooking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
              >
                {t('bookNow')}
              </button>
              {bookingSuccess && <p role="status" className="booking-feedback">{requestCopy.success} <strong>{bookingSuccess}</strong></p>}

              <button className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-3 px-6 rounded-lg transition-colors">
                {t('contactOwner')}
              </button>

              {/* Availability Calendar */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3">{t('availability')}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {availability.slice(0, 14).map((day) => (
                    <div
                      key={day.date}
                      className="text-center"
                    >
                      <div className="text-xs text-gray-600 mb-1">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div
                        className={`w-8 h-8 rounded-full ${getAvailabilityColor(day.status)} mx-auto`}
                        title={day.status}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center space-x-4 mt-3 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>{t('available')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>{t('pending')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>{t('booked')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="booking-title" className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form onSubmit={submitBooking} className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90dvh] overflow-y-auto">
            <h2 id="booking-title" className="text-2xl font-bold mb-4">{t('confirmBooking')}</h2>
            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-gray-600">{t('halls')}</div>
                <div className="font-semibold">{language === 'uz' ? hall.nameUz || hall.name : language === 'ru' ? hall.nameRu || hall.name : hall.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">{t('weddingDate')}</div>
                <div className="font-semibold">{selectedDate}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">{t('guests')}</div>
                <div className="font-semibold">{guestCount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">{serviceCopy.selected}</div>
                {availableSelection.length ? <ul className="booking-selected-services">{availableSelection.map(name => <li key={name}>{serviceLabel(name, language)}</li>)}</ul> : <p>{serviceCopy.empty}</p>}
                <p className="service-selector-hint">{serviceCopy.priceNote}</p>
              </div>
              {hasCatering && <div>
                <div className="text-sm text-gray-600">{foodCopy.selected}</div>
                {selectedFood.length ? <ul className="booking-selected-services">{selectedFood.map(id => <li key={id}>{foodLabel(id, language)}</li>)}</ul> : <p>{foodCopy.empty}</p>}
                <p className="service-selector-hint">{foodCopy.hint}</p>
              </div>}
              <div>
                <div className="text-sm text-gray-600">{t('totalPrice')}</div>
                <div className="font-semibold text-blue-600">
                  {hall.totalPrice.toLocaleString('en-US')} UZS
                </div>
              </div>
              <label className="block"><span className="text-sm text-gray-600">{t('fullName')}</span><input className="booking-contact-input" type="text" autoComplete="name" required minLength={2} maxLength={100} value={customerName} onChange={event => setCustomerName(event.target.value)} /></label>
              <label className="block"><span className="text-sm text-gray-600">{t('phone')}</span><input className="booking-contact-input" type="tel" autoComplete="tel" required maxLength={20} value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} /></label>
            </div>
            <p className="service-selector-hint">{requestCopy.note}</p>
            {bookingError && <p role="alert" className="booking-error">{bookingError}</p>}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {submitting ? requestCopy.sending : t('confirm')}
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}
