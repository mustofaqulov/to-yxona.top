'use client';

import { Children, isValidElement, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type OptionHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { usePopover } from './usePopover';

type SelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'children'> & {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
};

export default function Select({ className = '', children, value, onValueChange, disabled, name, ...props }: SelectProps) {
  const options = Children.toArray(children).filter(isValidElement<OptionHTMLAttributes<HTMLOptionElement>>).map(option => ({
    value: String(option.props.value ?? ''), label: option.props.children, disabled: option.props.disabled,
  }));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const typed = useRef({ text: '', time: 0 });
  const { triggerRef, panelRef } = usePopover(open, () => setOpen(false));
  const selected = options.findIndex(option => option.value === value);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  function show() { setActive(selected >= 0 ? selected : 0); setOpen(true); }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }
  return <>
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    <button {...props} ref={triggerRef} type="button" disabled={disabled} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open ? `${id}-${active}` : undefined}
      className={`app-select custom-select ${className}`} onClick={() => open ? setOpen(false) : show()}
      onKeyDown={event => {
        if (event.key === 'Tab') { setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!open) { show(); return; }
          const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
          const current = enabled.indexOf(active);
          const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length];
          if (next !== undefined) setActive(next);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (open) choose(active); else show();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          const now = Date.now();
          typed.current.text = (now - typed.current.time > 700 ? '' : typed.current.text) + event.key.toLocaleLowerCase();
          typed.current.time = now;
          const match = options.findIndex(option => !option.disabled && String(option.label).toLocaleLowerCase().startsWith(typed.current.text));
          if (match >= 0) { setActive(match); setOpen(true); }
        }
      }}><span>{options[selected]?.label ?? options[0]?.label}</span></button>
    {open && createPortal(<div ref={panelRef} className="control-popover select-popover" style={{ visibility: 'hidden' }}>
      <div id={id} role="listbox" aria-label={props['aria-label']}>
        {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
          className={`select-option${index === active ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
          onPointerMove={() => !option.disabled && setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
          <span>{option.label}</span>{option.value === value && <Icon name="check" width={16} height={16} />}
        </div>)}
      </div>
    </div>, document.body)}
  </>;
}
