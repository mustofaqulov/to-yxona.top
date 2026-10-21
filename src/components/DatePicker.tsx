'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppSettings } from './AppSettings';
import Icon from './Icon';
import { usePopover } from './usePopover';

export function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function parse(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
const labels = {
  uz: { today: 'Bugun', clear: 'Tozalash', previous: 'Oldingi oy', next: 'Keyingi oy', close: 'Yopish' },
  en: { today: 'Today', clear: 'Clear', previous: 'Previous month', next: 'Next month', close: 'Close' },
  ru: { today: 'Сегодня', clear: 'Очистить', previous: 'Предыдущий месяц', next: 'Следующий месяц', close: 'Закрыть' },
};
const uzMonths = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const uzWeekdays = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const uzWeekdaysShort = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

type DatePickerProps = {
  value: string; onValueChange: (value: string) => void; min?: string; max?: string;
  id?: string; name?: string; disabled?: boolean; className?: string; 'aria-label'?: string;
};

export default function DatePicker({ value, onValueChange, min, max, id, name, disabled, className = '', 'aria-label': ariaLabel }: DatePickerProps) {
  const { language, t } = useAppSettings();
  const locale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-GB';
  const copy = labels[language];
  const today = dateValue(new Date());
  const clamp = (day: string) => min && day < min ? min : max && day > max ? max : day;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(value || today);
  const [month, setMonth] = useState(() => parse(value || today));
  const moveFocus = useRef(false);
  const panelId = useId();
  const { triggerRef, panelRef } = usePopover(open, () => setOpen(false), 320);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i));
  const inRange = (day: string) => (!min || day >= min) && (!max || day <= max);
  const formatDate = (date: Date, full = false) => language === 'uz'
    ? `${full ? uzWeekdays[(date.getDay() + 6) % 7] + ', ' : ''}${date.getDate()} ${uzMonths[date.getMonth()].toLowerCase()} ${date.getFullYear()}`
    : date.toLocaleDateString(locale, { ...(full ? { weekday: 'long' as const } : {}), day: 'numeric', month: full ? 'long' : 'short', year: 'numeric' });

  useEffect(() => {
    if (open && moveFocus.current) {
      panelRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
      moveFocus.current = false;
    }
  }, [open, focused, panelRef]);

  function show() {
    const initial = clamp(value || today);
    setFocused(initial);
    setMonth(parse(initial));
    moveFocus.current = true;
    setOpen(true);
  }
  function choose(day: string) {
    if (day && !inRange(day)) return;
    onValueChange(day);
    setOpen(false);
    triggerRef.current?.focus();
  }
  function changeMonth(delta: number, keyboard = false) {
    const current = parse(focused);
    const target = new Date(year, monthIndex + delta, 1);
    target.setDate(Math.min(current.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
    const next = clamp(dateValue(target));
    moveFocus.current = keyboard;
    setFocused(next);
    setMonth(parse(next));
  }

  return <>
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    <button id={id} ref={triggerRef} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId}
      className={`date-trigger ${className}`} onClick={() => open ? setOpen(false) : show()}>
      <span className={value ? '' : 'date-placeholder'}>{value ? formatDate(parse(value)) : t('selectDate')}</span><Icon name="calendar" width={18} height={18} />
    </button>
    {open && createPortal(<div ref={panelRef} id={panelId} role="dialog" aria-modal="true" aria-label={ariaLabel || t('selectDate')} className="control-popover date-popover" style={{ visibility: 'hidden' }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []).filter(button => button.tabIndex >= 0);
        const firstButton = buttons[0];
        const lastButton = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === firstButton) { event.preventDefault(); lastButton?.focus(); }
        else if (!event.shiftKey && document.activeElement === lastButton) { event.preventDefault(); firstButton?.focus(); }
      }}>
      <div className="calendar-heading"><span>{t('selectDate')}</span><button type="button" className="calendar-icon" aria-label={copy.close} onClick={() => { setOpen(false); triggerRef.current?.focus(); }}><Icon name="close" width={16} height={16} /></button></div>
      <div className="calendar-navigation">
        <button type="button" className="calendar-icon" aria-label={copy.previous} disabled={!!min && dateValue(new Date(year, monthIndex, 0)) < min} onClick={() => changeMonth(-1)}><Icon name="arrow" className="calendar-back" width={17} /></button>
        <h2 id={`${panelId}-month`} aria-live="polite">{language === 'uz' ? `${uzMonths[monthIndex]} ${year}` : first.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</h2>
        <button type="button" className="calendar-icon" aria-label={copy.next} disabled={!!max && dateValue(new Date(year, monthIndex + 1, 1)) > max} onClick={() => changeMonth(1)}><Icon name="arrow" width={17} /></button>
      </div>
      <table className="calendar-grid" role="grid" aria-labelledby={`${panelId}-month`}>
        <thead><tr>{weekdays.map((day, i) => <th key={day.getDay()} scope="col" aria-label={language === 'uz' ? uzWeekdays[i] : day.toLocaleDateString(locale, { weekday: 'long' })}>{language === 'uz' ? uzWeekdaysShort[i] : day.toLocaleDateString(locale, { weekday: 'short' })}</th>)}</tr></thead>
        <tbody>{Array.from({ length: cellCount / 7 }, (_, row) => <tr key={row}>{Array.from({ length: 7 }, (_, column) => {
          const number = row * 7 + column - offset + 1;
          if (number < 1 || number > daysInMonth) return <td key={column} />;
          const date = new Date(year, monthIndex, number);
          const day = dateValue(date);
          const selected = day === value;
          return <td key={column} aria-selected={selected}><button type="button" data-date={day} tabIndex={day === focused ? 0 : -1} disabled={!inRange(day)}
            aria-label={formatDate(date, true)} aria-current={day === today ? 'date' : undefined}
            className={`calendar-day${selected ? ' is-selected' : ''}${day === today ? ' is-today' : ''}`} onClick={() => choose(day)}
            onKeyDown={event => {
              const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -((date.getDay() + 6) % 7), End: 6 - ((date.getDay() + 6) % 7) };
              if (event.key === 'PageUp' || event.key === 'PageDown') {
                event.preventDefault(); changeMonth((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1), true);
              } else if (event.key in deltas) {
                event.preventDefault(); date.setDate(date.getDate() + deltas[event.key]);
                const next = clamp(dateValue(date)); moveFocus.current = true; setFocused(next); setMonth(parse(next));
              }
            }}>{number}</button></td>;
        })}</tr>)}</tbody>
      </table>
      <div className="calendar-footer"><button type="button" onClick={() => choose('')} disabled={!value}>{copy.clear}</button><button type="button" className="calendar-today" disabled={!inRange(today)} onClick={() => choose(today)}>{copy.today}</button></div>
    </div>, document.body)}
  </>;
}
