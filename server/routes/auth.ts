import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'driver', 'customer']),
  phone: z.string().optional(),
  profile: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    address: z.string().optional(),
    payment_preferences: z.any().optional()
  }).optional(),
  driver_profile: z.object({
    license_number: z.string().optional(),
    id_proof_url: z.string().url().optional(),
    work_permit_url: z.string().url().optional(),
    employment_status: z.enum(['active', 'inactive', 'suspended']).optional()
  }).optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Public registration
export const handleRegister: RequestHandler = async (req, res) => {
  try {

    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        ok: false, 
        error: parsed.error.issues[0]?.message || 'Invalid input' 
      });
    }

    const data = parsed.data;

    // Check if user already exists
    const existingUser = await AuthService.findUserByEmail(data.email);
    if (existingUser) {
      return res.status(409).json({ ok: false, error: 'User already exists' });
    }

    // Validate driver-specific requirements
    if (data.role === 'driver') {
      if (!data.driver_profile?.license_number) {
        return res.status(400).json({ ok: false, error: 'License number required for drivers' });
      }
    }

    // Create user
    const userId = await AuthService.createUser({
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
      profile: data.profile,
      driver_profile: data.driver_profile
    });
    
    res.status(201).json({ 
      ok: true, 
      message: 'User registered successfully',
      userId 
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Registration failed' 
    });
  }
};

// Public login endpoint
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        ok: false, 
        error: parsed.error.issues[0]?.message || 'Invalid input' 
      });
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await AuthService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    // Get user's password hash
    const [rows] = await (await import('../db')).pool.execute(
      'SELECT password_hash FROM users WHERE email = ?',
      [email]
    );
    const users = rows as any[];
    if (users.length === 0) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const passwordHash = users[0].password_hash;

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({ ok: false, error: 'Account is not active' });
    }

    // Generate token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    });

    // Create session
    await AuthService.createSession(user.id, token);

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
        driver_profile: user.driver_profile
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Login failed' 
    });
  }
};

// Logout endpoint
export const handleLogout: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ ok: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    await AuthService.revokeSession(token);

    res.json({ ok: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Logout failed' 
    });
  }
};

// Get current user info
export const handleMe: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const user = await AuthService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profile: user.profile,
        driver_profile: user.driver_profile
      }
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Failed to get user info' 
    });
  }
};

// Public registration endpoint (for customers only)
export const handlePublicRegister: RequestHandler = async (req, res) => {
  try {
    const parsed = RegisterSchema.pick({
      email: true,
      password: true,
      phone: true,
      profile: true,
      role: true
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ 
        ok: false, 
        error: parsed.error.issues[0]?.message || 'Invalid input' 
      });
    }

    const data = parsed.data;

    // Check if user already exists
    const existingUser = await AuthService.findUserByEmail(data.email);
    if (existingUser) {
      return res.status(409).json({ ok: false, error: 'User already exists' });
    }

    // Create user
    const userId = await AuthService.createUser({
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
      profile: data.profile
    });
    
    res.status(201).json({ 
      ok: true, 
      message: 'Customer registered successfully',
      userId 
    });
  } catch (error: any) {
    console.error('Public registration error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error?.message || 'Registration failed' 
    });
  }
};
