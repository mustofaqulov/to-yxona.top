import { useMemo, useSyncExternalStore } from 'react';

// Browser-side session helpers: the JWT and public user live in localStorage.
export type SessionUser = {
  id: string;
  phone: string;
  fullName: string;
  role: string;
  profileImage?: string | null;
};

const AUTH_EVENT = 'toyxona-auth-change';
const STAFF_ROLES = ['WEDDING_HALL_OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MODERATOR', 'SUPPORT', 'FINANCE'];

export function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export function hasToken() {
  return 'Authorization' in authHeaders();
}

export function isStaffRole(role: string | undefined) {
  return !!role && STAFF_ROLES.includes(role);
}

export function storeSessionUser(user: SessionUser) {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch { /* storage unavailable: session stays in memory only */ }
}

export function storeSession(token: string, user: SessionUser) {
  try {
    localStorage.setItem('token', token);
    storeSessionUser(user);
  } catch { /* storage unavailable: the user will need to sign in again */ }
}

export function clearSession() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch { /* nothing to clear */ }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(AUTH_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
}

function readRawUser() {
  try { return localStorage.getItem('user'); } catch { return null; }
}

const subscribeNever = () => () => undefined;

/** Current signed-in user (null when signed out). `ready` is false until the browser has hydrated. */
export function useSessionUser() {
  const raw = useSyncExternalStore(subscribe, readRawUser, () => null);
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const user = useMemo<SessionUser | null>(() => {
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && typeof (parsed as SessionUser).id === 'string' ? (parsed as SessionUser) : null;
    } catch { return null; }
  }, [raw]);
  return { user, ready };
}
