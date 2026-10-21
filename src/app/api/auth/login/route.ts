import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, type StoredUser } from '@/lib/auth';

// In-memory user storage (shared with register)
const users = new Map<string, StoredUser>();

// Helper to load users from register's storage
function loadUsers() {
  // In a real app, this would come from the database
  // For now, we'll create a demo user if none exists
  if (users.size === 0) {
    const demoUser: StoredUser = {
      id: 'demo-user-1',
      phone: '+998901234567',
      passwordHash: Buffer.from('password123').toString('base64'),
      fullName: 'Demo User',
      role: 'CUSTOMER',
      profileImage: null,
      createdAt: new Date().toISOString(),
    };
    users.set('+998901234567', demoUser);
  }
}

export async function POST(request: NextRequest) {
  try {
    loadUsers();
    
    const body = await request.json();
    const { phone, password } = body;

    // Validation
    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Phone and password are required' } },
        { status: 400 }
      );
    }

    // Find user
    const user = users.get(phone);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password' } },
        { status: 401 }
      );
    }

    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password' } },
        { status: 401 }
      );
    }

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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'An error occurred during login' } },
      { status: 500 }
    );
  }
}
