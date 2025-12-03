import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../db';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'driver' | 'customer';
  status: 'active' | 'inactive' | 'pending';
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  role: 'admin' | 'driver' | 'customer';
  status: 'active' | 'inactive' | 'pending';
  profile?: {
    first_name?: string;
    last_name?: string;
    address?: string;
    payment_preferences?: any;
  };
  driver_profile?: {
    license_number?: string;
    id_proof_url?: string;
    work_permit_url?: string;
    employment_status?: 'active' | 'inactive' | 'suspended';
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

export class AuthService {
  // Password hashing
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // JWT token operations
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      console.log("AuthService - Verifying token:", token.substring(0, 50) + "...");
      console.log("AuthService - JWT_SECRET:", JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "UNDEFINED");
      
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      console.log("AuthService - Token decoded successfully:", decoded);
      return decoded;
    } catch (error) {
      console.log("AuthService - Token verification failed:", error);
      return null;
    }
  }

  // Token hashing for session storage
  static async hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // User operations
  static async findUserByEmail(email: string): Promise<AuthUser | null> {
    const [rows] = await pool.execute(`
      SELECT 
        u.id,
        u.email,
        u.phone,
        u.role,
        u.status,
        p.first_name,
        p.last_name,
        p.address,
        p.payment_preferences,
        dp.license_number,
        dp.id_proof_url,
        dp.work_permit_url,
        dp.employment_status
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN driver_profiles dp ON u.id = dp.user_id
      WHERE u.email = ?
    `, [email]);

    const users = rows as any[];
    if (users.length === 0) return null;

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      profile: user.first_name || user.last_name || user.address ? {
        first_name: user.first_name,
        last_name: user.last_name,
        address: user.address,
        payment_preferences: user.payment_preferences
      } : undefined,
      driver_profile: user.license_number ? {
        license_number: user.license_number,
        id_proof_url: user.id_proof_url,
        work_permit_url: user.work_permit_url,
        employment_status: user.employment_status
      } : undefined
    };
  }

  static async findUserById(userId: string): Promise<AuthUser | null> {
    const [rows] = await pool.execute(`
      SELECT 
        u.id,
        u.email,
        u.phone,
        u.role,
        u.status,
        p.first_name,
        p.last_name,
        p.address,
        p.payment_preferences,
        dp.license_number,
        dp.id_proof_url,
        dp.work_permit_url,
        dp.employment_status
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN driver_profiles dp ON u.id = dp.user_id
      WHERE u.id = ?
    `, [userId]);

    const users = rows as any[];
    if (users.length === 0) return null;

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      profile: user.first_name || user.last_name || user.address ? {
        first_name: user.first_name,
        last_name: user.last_name,
        address: user.address,
        payment_preferences: user.payment_preferences
      } : undefined,
      driver_profile: user.license_number ? {
        license_number: user.license_number,
        id_proof_url: user.id_proof_url,
        work_permit_url: user.work_permit_url,
        employment_status: user.employment_status
      } : undefined
    };
  }

  static async createUser(userData: {
    email: string;
    password: string;
    role: 'admin' | 'driver' | 'customer';
    phone?: string;
    profile?: {
      first_name?: string;
      last_name?: string;
      address?: string;
      payment_preferences?: any;
    };
    driver_profile?: {
      license_number?: string;
      id_proof_url?: string;
      work_permit_url?: string;
      employment_status?: 'active' | 'inactive' | 'suspended';
    };
  }): Promise<string> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Generate UUID for the user
      const userId = crypto.randomUUID();

      // Insert user
      const passwordHash = await this.hashPassword(userData.password);
      await connection.execute(`
        INSERT INTO users (id, email, password_hash, role, status, phone)
        VALUES (?, ?, ?, ?, 'active', ?)
      `, [userId, userData.email, passwordHash, userData.role, userData.phone || null]);

      // Insert profile if provided
      if (userData.profile) {
        await connection.execute(`
          INSERT INTO profiles (user_id, first_name, last_name, address, payment_preferences)
          VALUES (?, ?, ?, ?, ?)
        `, [
          userId,
          userData.profile.first_name || null,
          userData.profile.last_name || null,
          userData.profile.address || null,
          userData.profile.payment_preferences ? JSON.stringify(userData.profile.payment_preferences) : null
        ]);
      }

      // Insert driver profile if provided
      if (userData.driver_profile && userData.role === 'driver') {
        await connection.execute(`
          INSERT INTO driver_profiles (user_id, license_number, id_proof_url, work_permit_url, employment_status)
          VALUES (?, ?, ?, ?, ?)
        `, [
          userId,
          userData.driver_profile.license_number || null,
          userData.driver_profile.id_proof_url || null,
          userData.driver_profile.work_permit_url || null,
          userData.driver_profile.employment_status || 'active'
        ]);
      }

      await connection.commit();
      return userId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async createSession(userId: string, token: string): Promise<void> {
    const tokenHash = await this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    console.log("AuthService - Creating session for user:", userId);
    console.log("AuthService - Token hash:", tokenHash.substring(0, 20) + "...");
    console.log("AuthService - Expires at:", expiresAt);

    // Generate UUID for the session
    const sessionId = crypto.randomUUID();

    await pool.execute(`
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `, [sessionId, userId, tokenHash, expiresAt]);
    
    console.log("AuthService - Session created successfully");
  }

  static async revokeSession(token: string): Promise<void> {
    const tokenHash = await this.hashToken(token);
    await pool.execute(`
      DELETE FROM user_sessions WHERE token_hash = ?
    `, [tokenHash]);
  }

  static async revokeAllUserSessions(userId: string): Promise<void> {
    await pool.execute(`
      DELETE FROM user_sessions WHERE user_id = ?
    `, [userId]);
  }

  static async isTokenValid(token: string): Promise<boolean> {
    const tokenHash = await this.hashToken(token);
    console.log("AuthService - Token hash:", tokenHash.substring(0, 20) + "...");
    
    const [rows] = await pool.execute(`
      SELECT 1 FROM user_sessions 
      WHERE token_hash = ? AND expires_at > NOW()
      LIMIT 1
    `, [tokenHash]);

    console.log("AuthService - Session rows found:", (rows as any[]).length);
    return (rows as any[]).length > 0;
  }

  static async cleanupExpiredSessions(): Promise<void> {
    await pool.execute(`
      DELETE FROM user_sessions WHERE expires_at <= NOW()
    `);
  }
}
