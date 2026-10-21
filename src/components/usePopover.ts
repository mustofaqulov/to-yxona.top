'use client';

import { useLayoutEffect, useRef } from 'react';

/** Keeps portal panels inside the viewport and handles dismissal for both controls. */
export function usePopover(open: boolean, onClose: () => void, width?: number) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(width ?? Math.max(rect.width, 170), window.innerWidth - 24);
      panel.style.width = `${panelWidth}px`;
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const height = Math.min(panel.scrollHeight, 420);
      const placeAbove = below < height && above > below;
      panel.style.maxHeight = `${Math.max(80, Math.min(420, placeAbove ? above : below))}px`;
      panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12))}px`;
      const top = placeAbove ? rect.top - panel.offsetHeight - 8 : rect.bottom + 8;
      panel.style.top = `${Math.max(12, Math.min(top, window.innerHeight - panel.offsetHeight - 12))}px`;
      panel.style.visibility = 'visible';
    };
    const outside = (event: Event) => {
      if (event.target instanceof Node && !trigger.contains(event.target) && !panel.contains(event.target)) closeRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        trigger.focus();
      }
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    observer.observe(trigger);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, width]);
  return { triggerRef, panelRef };
}
