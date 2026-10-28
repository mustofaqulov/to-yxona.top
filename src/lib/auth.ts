import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User as DbUser, UserRole } from '@prisma/client';
import { db } from './db';
import { HttpError } from './http';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  profileImage?: string | null;
}

const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;
const ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MODERATOR', 'SUPPORT', 'FINANCE'];

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw new Error('JWT_SECRET must be set (at least 16 characters).');
  return secret;
}

export function validatePassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: Pick<DbUser, 'id' | 'role'>) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: TOKEN_TTL });
}

export function toPublicUser(user: DbUser): User {
  return { id: user.id, phone: user.phone, fullName: user.fullName, role: user.role, profileImage: user.profileImage };
}

export function isAdmin(user: Pick<DbUser, 'role' | 'isAdmin'>) {
  return user.isAdmin || ADMIN_ROLES.includes(user.role);
}

/** Resolves the signed-in user from the Bearer token, or null. Always re-reads the user so deactivation takes effect. */
export async function getAuthUser(request: NextRequest): Promise<DbUser | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  let subject: string;
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret());
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    subject = payload.sub;
  } catch { return null; }
  const user = await db.user.findUnique({ where: { id: subject } });
  return user?.isActive ? user : null;
}

export async function requireUser(request: NextRequest): Promise<DbUser> {
  const user = await getAuthUser(request);
  if (!user) throw new HttpError(401, 'Tizimga kiring.', 'UNAUTHORIZED');
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<DbUser> {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'Ruxsat yo‘q.', 'FORBIDDEN');
  return user;
}

/** Hall owners and admins can manage venues. */
export async function requireVenueManager(request: NextRequest): Promise<DbUser> {
  const user = await requireUser(request);
  if (user.role !== 'WEDDING_HALL_OWNER' && !isAdmin(user)) throw new HttpError(403, 'Ruxsat yo‘q.', 'FORBIDDEN');
  return user;
}
