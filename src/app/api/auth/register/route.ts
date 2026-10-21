import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, hashPassword, createSession, type StoredUser } from '@/lib/auth';

// In-memory user storage (for development only)
const users = new Map<string, StoredUser>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, fullName, role = 'CUSTOMER' } = body;

    // Validation
    if (!phone || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'All fields are required' } },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users.has(phone)) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_EXISTS', message: 'User with this phone number already exists' } },
        { status: 409 }
      );
    }

    // Create user
    const user: StoredUser = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      phone,
      passwordHash: hashPassword(password),
      fullName,
      role,
      profileImage: null,
      createdAt: new Date().toISOString(),
    };

    users.set(phone, user);

    // Create session
    const sessionUser = {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      profileImage: user.profileImage ?? undefined,
    };

    const token = createSession(sessionUser);

    return NextResponse.json({
      success: true,
      data: {
        user: sessionUser,
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred during registration' } },
      { status: 500 }
    );
  }
}
