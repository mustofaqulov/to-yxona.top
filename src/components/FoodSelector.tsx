'use client';

import { useId } from 'react';
import { useAppSettings, type Language } from './AppSettings';
import { foods } from '@/lib/food-menu';

export const foodSelectionCopy = {
  uz: { title: 'Taomlarni tanlang', hint: 'Katering uchun xohlagan taomlaringizni belgilang. Bu namunaviy ro‘yxat; mavjudligi va narxini to‘yxona egasi bilan kelishing.', selected: 'Tanlangan taomlar', empty: 'Taom tanlanmagan', main: 'Asosiy taomlar', salad: 'Salatlar', dessert: 'Desert va mevalar' },
  en: { title: 'Choose food', hint: 'Select the dishes you would like for catering. This is a sample menu; confirm availability and pricing with the venue owner.', selected: 'Selected food', empty: 'No food selected', main: 'Main dishes', salad: 'Salads', dessert: 'Desserts and fruit' },
  ru: { title: 'Выберите блюда', hint: 'Отметьте блюда для кейтеринга. Это пример меню; наличие и стоимость уточните у владельца зала.', selected: 'Выбранные блюда', empty: 'Блюда не выбраны', main: 'Основные блюда', salad: 'Салаты', dessert: 'Десерты и фрукты' },
} as const;

export function foodLabel(id: string, language: Language) {
  return foods.find(food => food.id === id)?.[language] ?? id;
}

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

export default function FoodSelector({ value, onChange }: Props) {
  const { language, t } = useAppSettings();
  const copy = foodSelectionCopy[language];
  const hintId = useId();

  return <fieldset className="food-selector" aria-describedby={hintId}>
    <legend>{copy.title}</legend>
    <p id={hintId} className="service-selector-hint">{copy.hint}</p>
    {(['main', 'salad', 'dessert'] as const).map(category => <div className="food-group" key={category}>
      <h3>{copy[category]}</h3>
      <div className="food-grid">{foods.filter(food => food.category === category).map(food => {
        const checked = value.includes(food.id);
        return <label key={food.id} className={`food-choice${checked ? ' is-selected' : ''}`}>
          <span>{food[language]}</span>
          <input type="checkbox" checked={checked} onChange={() => onChange(checked ? value.filter(id => id !== food.id) : [...value, food.id])} />
        </label>;
      })}</div>
    </div>)}
    <div className="service-selection-summary"><span role="status">{copy.selected}: {value.length}</span><button type="button" disabled={value.length === 0} onClick={() => onChange([])}>{t('clearAll')}</button></div>
  </fieldset>;
}
