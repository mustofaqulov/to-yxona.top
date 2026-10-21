// Authentication utilities
// Note: This is a simplified version for development
// In production, use proper session management and secure cookies

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: 'CUSTOMER' | 'WEDDING_HALL_OWNER' | 'SERVICE_PROVIDER' | 'ADMIN';
  profileImage?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export type StoredUser = Omit<User, 'profileImage'> & {
  profileImage: string | null;
  passwordHash: string;
  createdAt: string;
};

// In-memory session storage (for development only)
const sessions = new Map<string, AuthSession>();

export function createSession(user: User): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const session: AuthSession = { user, token };
  sessions.set(token, session);
  return token;
}

export function getSession(token: string): AuthSession | null {
  return sessions.get(token) || null;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function validatePassword(password: string): boolean {
  // Password must be at least 8 characters
  return password.length >= 8;
}

export function hashPassword(password: string): string {
  // Simple hash for development - use bcrypt in production
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
