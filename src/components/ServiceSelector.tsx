'use client';

import { useId } from 'react';
import { demoServices } from '@/lib/demo-data';
import { useAppSettings } from './AppSettings';
import Icon from './Icon';

export const serviceSelectionCopy = {
  uz: { choose: 'To‘y xizmatlarini tanlang', hint: 'Bir yoki bir nechta xizmatni belgilang.', selected: 'Tanlangan xizmatlar', empty: 'Xizmat tanlanmagan', unavailable: 'Bu to‘yxonada xizmatlar ko‘rsatilmagan.', find: 'Mos to‘yxonalarni ko‘rish', priceNote: 'Xizmatlarning alohida narxi ko‘rsatilmagan. Narxini to‘yxona egasi bilan kelishing.', demo: 'Bu buyurtma namunasi. Egaga hali yuborilmadi.' },
  en: { choose: 'Choose wedding services', hint: 'Select one or more services.', selected: 'Selected services', empty: 'No services selected', unavailable: 'No services listed for this venue.', find: 'Find matching venues', priceNote: 'Separate service prices are not listed. Confirm them with the venue owner.', demo: 'This is a booking preview. It has not been sent to the owner.' },
  ru: { choose: 'Выберите свадебные услуги', hint: 'Можно выбрать несколько услуг.', selected: 'Выбранные услуги', empty: 'Услуги не выбраны', unavailable: 'Услуги для этого зала не указаны.', find: 'Найти подходящие залы', priceNote: 'Отдельные цены на услуги не указаны. Уточните их у владельца зала.', demo: 'Это пример бронирования. Он ещё не отправлен владельцу.' },
};

export function serviceLabel(name: string, language: 'uz' | 'en' | 'ru') {
  const service = demoServices.find(item => item.name === name);
  return service ? language === 'uz' ? service.nameUz : language === 'ru' ? service.nameRu : service.name : name;
}

export function parseSelectedServices(value: string | null) {
  return [...new Set((value || '').split(',').map(name => name.trim()).filter(name => demoServices.some(service => service.name === name)))];
}

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  available?: string[];
  compact?: boolean;
};

export default function ServiceSelector({ value, onChange, available = demoServices.map(service => service.name), compact = false }: Props) {
  const { language, t } = useAppSettings();
  const copy = serviceSelectionCopy[language];
  const hintId = useId();
  const options = [...new Set(available)];
  const selected = value.filter(name => options.includes(name));
  return <fieldset className={`service-selector${compact ? ' service-selector-compact' : ''}`} aria-describedby={hintId}>
    <legend>{copy.choose}</legend>
    <p id={hintId} className="service-selector-hint">{options.length ? copy.hint : copy.unavailable}</p>
    <div className="service-selector-grid">{options.map(name => {
      const service = demoServices.find(item => item.name === name);
      const checked = selected.includes(name);
      return <label key={name} className={`service-choice${checked ? ' is-selected' : ''}`}>
        <span className="service-choice-icon" aria-hidden="true"><Icon name={service?.icon ?? 'sparkles'} width="1em" height="1em" /></span>
        <span>{serviceLabel(name, language)}</span>
        <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter(item => item !== name) : [...selected, name])} />
      </label>;
    })}</div>
    <div className="service-selection-summary"><span role="status">{copy.selected}: {selected.length}</span><button type="button" disabled={selected.length === 0} onClick={() => onChange([])}>{t('clearAll')}</button></div>
  </fieldset>;
}
