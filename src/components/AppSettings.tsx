'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'uz' | 'en' | 'ru';

const messages = {
  uz: {
    tagline: "To'yingiz uchun hamma narsa - bitta joyda.",
    home: 'Bosh sahifa', halls: 'To‘yxonalar', services: 'Xizmatlar', about: 'Biz haqimizda', contact: 'Aloqa', login: 'Kirish', register: 'Ro‘yxatdan o‘tish', profile: 'Profil', favorites: 'Sevimlilar', settings: 'Sozlamalar', myBookings: 'Buyurtmalarim',
    search: 'Qidirish', city: 'Shahar', selectCity: 'Shaharni tanlang', weddingDate: 'To‘y sanasi', guests: 'Mehmonlar soni', budget: 'Byudjet (UZS)', popularHalls: 'Mashhur to‘yxonalar',
    filters: 'Filtrlar', clearAll: 'Tozalash', capacity: 'Sig‘im', minCapacity: 'Eng kam sig‘im', maxBudget: 'Eng yuqori byudjet (UZS)', rating: 'Reyting', anyRating: 'Istalgan reyting', servicesFilter: 'Kerakli xizmatlar', sortBy: 'Saralash', recommended: 'Tavsiya etilgan', priceAsc: 'Narx: arzonidan', priceDesc: 'Narx: qimmatidan', highestRated: 'Eng yuqori reyting', mostBooked: 'Ko‘p buyurtma qilingan', newest: 'Yangilari', hallsFound: 'ta to‘yxona topildi', viewDetails: 'Batafsil',
    verified: 'Tekshirilgan', reviews: 'sharh', bookings: 'buyurtma', guestsUnit: 'mehmon', district: 'Tuman', price: 'Narx', availableServices: 'Mavjud xizmatlar', reviewsTitle: 'Mijozlar sharhlari', noReviews: 'Hozircha sharhlar yo‘q.', totalPrice: 'Umumiy narx', selectDate: 'Sanani tanlang', bookNow: 'Band qilish', contactOwner: 'Egasi bilan bog‘lanish', availability: 'Bo‘sh sanalar', available: 'Bo‘sh', pending: 'Kutilmoqda', booked: 'Band', backToHalls: 'To‘yxonalar ro‘yxatiga qaytish', hallNotFound: 'To‘yxona topilmadi',
    fullDetails: 'To‘yxona haqida to‘liq ma’lumot', location: 'Manzil', description: 'Tavsif', pricePerPerson: 'Bir mehmon uchun', capacityLabel: 'Sig‘imi', bookingCount: 'Jami buyurtmalar', confirmBooking: 'Buyurtmani tasdiqlash', cancel: 'Bekor qilish', confirm: 'Tasdiqlash',
    phone: 'Telefon raqami', password: 'Parol', fullName: 'Ism-familiya', confirmPassword: 'Parolni tasdiqlang',
  },
  en: {
    tagline: 'Everything for your wedding in one place.',
    home: 'Home', halls: 'Wedding halls', services: 'Services', about: 'About', contact: 'Contact', login: 'Login', register: 'Register', profile: 'Profile', favorites: 'Favorites', settings: 'Settings', myBookings: 'My bookings',
    search: 'Search', city: 'City', selectCity: 'Select a city', weddingDate: 'Wedding date', guests: 'Number of guests', budget: 'Budget (UZS)', popularHalls: 'Popular wedding halls',
    filters: 'Filters', clearAll: 'Clear all', capacity: 'Capacity', minCapacity: 'Minimum capacity', maxBudget: 'Maximum budget (UZS)', rating: 'Rating', anyRating: 'Any rating', servicesFilter: 'Required services', sortBy: 'Sort by', recommended: 'Recommended', priceAsc: 'Price: low to high', priceDesc: 'Price: high to low', highestRated: 'Highest rated', mostBooked: 'Most booked', newest: 'Newest', hallsFound: 'wedding halls found', viewDetails: 'View details',
    verified: 'Verified', reviews: 'reviews', bookings: 'bookings', guestsUnit: 'guests', district: 'District', price: 'Price', availableServices: 'Available services', reviewsTitle: 'Customer reviews', noReviews: 'No reviews yet.', totalPrice: 'Total price', selectDate: 'Select a date', bookNow: 'Book now', contactOwner: 'Contact owner', availability: 'Availability', available: 'Available', pending: 'Pending', booked: 'Booked', backToHalls: 'Back to wedding halls', hallNotFound: 'Wedding hall not found',
    fullDetails: 'Full wedding hall details', location: 'Location', description: 'Description', pricePerPerson: 'Per guest', capacityLabel: 'Capacity', bookingCount: 'Total bookings', confirmBooking: 'Confirm booking', cancel: 'Cancel', confirm: 'Confirm',
    phone: 'Phone number', password: 'Password', fullName: 'Full name', confirmPassword: 'Confirm password',
  },
  ru: {
    tagline: '\u0412\u0441\u0451 \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0439 \u0441\u0432\u0430\u0434\u044c\u0431\u044b - \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435.',
    home: 'Главная', halls: 'Банкетные залы', services: 'Услуги', about: 'О нас', contact: 'Контакты', login: 'Войти', register: 'Регистрация', profile: 'Профиль', favorites: 'Избранное', settings: 'Настройки', myBookings: 'Мои бронирования',
    search: 'Найти', city: 'Город', selectCity: 'Выберите город', weddingDate: 'Дата свадьбы', guests: 'Количество гостей', budget: 'Бюджет (UZS)', popularHalls: 'Популярные залы',
    filters: 'Фильтры', clearAll: 'Сбросить', capacity: 'Вместимость', minCapacity: 'Минимальная вместимость', maxBudget: 'Максимальный бюджет (UZS)', rating: 'Рейтинг', anyRating: 'Любой рейтинг', servicesFilter: 'Нужные услуги', sortBy: 'Сортировка', recommended: 'Рекомендуемые', priceAsc: 'Сначала дешевле', priceDesc: 'Сначала дороже', highestRated: 'С высоким рейтингом', mostBooked: 'Популярные', newest: 'Новые', hallsFound: 'банкетных залов найдено', viewDetails: 'Подробнее',
    verified: 'Проверено', reviews: 'отзывов', bookings: 'заказов', guestsUnit: 'гостей', district: 'Район', price: 'Цена', availableServices: 'Доступные услуги', reviewsTitle: 'Отзывы клиентов', noReviews: 'Пока нет отзывов.', totalPrice: 'Общая стоимость', selectDate: 'Выберите дату', bookNow: 'Забронировать', contactOwner: 'Связаться с владельцем', availability: 'Доступность', available: 'Свободно', pending: 'Ожидание', booked: 'Занято', backToHalls: 'Вернуться к залам', hallNotFound: 'Банкетный зал не найден',
    fullDetails: 'Полная информация о зале', location: 'Адрес', description: 'Описание', pricePerPerson: 'На одного гостя', capacityLabel: 'Вместимость', bookingCount: 'Всего заказов', confirmBooking: 'Подтверждение бронирования', cancel: 'Отмена', confirm: 'Подтвердить',
    phone: 'Номер телефона', password: 'Пароль', fullName: 'Имя и фамилия', confirmPassword: 'Подтвердите пароль',
  },
} as const;

type MessageKey = keyof typeof messages.en;
type SettingsContextValue = {
  language: Language;
  darkMode: boolean;
  setLanguage: (language: Language) => void;
  toggleDarkMode: () => void;
  t: (key: MessageKey) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState({ language: 'uz' as Language, darkMode: false, ready: false });
  const { language, darkMode, ready } = settings;

  useEffect(() => {
    const storedLanguage = localStorage.getItem('toyxona-language');
    // Read saved preferences before enabling writes, including during Strict Mode replay.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings({ language: storedLanguage === 'en' || storedLanguage === 'ru' ? storedLanguage : 'uz', darkMode: localStorage.getItem('toyxona-theme') === 'dark', ready: true });
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('toyxona-language', language);
    localStorage.setItem('toyxona-theme', darkMode ? 'dark' : 'light');
  }, [language, darkMode, ready]);

  const value = useMemo(() => ({
    language,
    darkMode,
    setLanguage: (language: Language) => setSettings(current => ({ ...current, language })),
    toggleDarkMode: () => setSettings(current => ({ ...current, darkMode: !current.darkMode })),
    t: (key: MessageKey) => messages[language][key] ?? messages.en[key],
  }), [language, darkMode]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return settings;
}
