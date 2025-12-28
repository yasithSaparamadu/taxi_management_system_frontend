import { RequestHandler } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { AuthService } from '../services/auth';
import { User, UserRole } from '@shared/api';

// Query parameters schema
const listUsersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  role: z.enum(['admin', 'driver', 'customer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  search: z.string().optional(),
});

// Update user schema
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'driver', 'customer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  profile: z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    profile_image_url: z.string().optional().or(z.literal('')),
  }).optional(),
  driver_profile: z.object({
    license_number: z.string().min(1).max(50).optional(),
    id_proof_url: z.string().optional().or(z.literal('')),
    work_permit_url: z.string().optional().or(z.literal('')),
    employment_status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }).optional(),
});

// Create user schema (admin-only)
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'driver', 'customer']),
  profile: z.object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    phone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    profile_image_url: z.string().optional().or(z.literal('')),
  }),
  driver_profile: z.object({
    license_number: z.string().min(1).max(50),
    id_proof_url: z.string().optional().or(z.literal('')),
    work_permit_url: z.string().optional().or(z.literal('')),
    employment_status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }).optional(),
});

// List users
export const handleListUsers: RequestHandler = async (req, res) => {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const { page, limit, role, status, search } = query;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];

    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }

    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      LEFT JOIN profiles p ON u.id = p.user_id 
      ${whereClause}
    `;
    const [countResult] = await pool.execute(countQuery, params);
    const total = (countResult as any[])[0].total;

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.id, u.email, u.role, u.status, u.created_at, u.updated_at, u.phone,
        p.first_name, p.last_name, p.address, p.profile_image_url,
        dp.license_number, 
        dp.employment_status,
        dp.id_proof_url,
        dp.work_permit_url
      FROM users u 
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN driver_profiles dp ON u.id = dp.user_id 
      ${whereClause}
      ORDER BY u.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [users] = await pool.execute(usersQuery, [...params, limit, offset]);

    // Format response
    const formattedUsers = (users as any[]).map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile: user.first_name || user.last_name || user.address || user.profile_image_url ? {
        first_name: user.first_name,
        last_name: user.last_name,
        address: user.address,
        profile_image_url: user.profile_image_url,
      } : undefined,
      driver_profile: user.license_number || user.employment_status || user.id_proof_url || user.work_permit_url ? {
        license_number: user.license_number,
        employment_status: user.employment_status,
        id_proof_url: user.id_proof_url,
        work_permit_url: user.work_permit_url,
      } : undefined,
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

// Get user by ID
export const handleGetUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        u.id, u.email, u.role, u.status, u.created_at, u.updated_at, u.phone,
        p.first_name, p.last_name, p.address, p.profile_image_url,
        dp.license_number, 
        dp.employment_status,
        dp.id_proof_url,
        dp.work_permit_url
      FROM users u 
      LEFT JOIN profiles p ON u.id = p.user_id 
      LEFT JOIN driver_profiles dp ON u.id = dp.user_id 
      WHERE u.id = ?
    `;
    
    const [users] = await pool.execute(query, [id]);
    
    if ((users as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = (users as any[])[0];
    
    const formattedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        address: user.address,
        profile_image_url: user.profile_image_url,
      },
      driver_profile: {
        license_number: user.license_number,
        employment_status: user.employment_status,
        id_proof_url: user.id_proof_url,
        work_permit_url: user.work_permit_url,
      },
    };

    res.json({ user: formattedUser });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Create user (admin-only)
export const handleCreateUser: RequestHandler = async (req, res) => {
  try {
    const userData = createUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await AuthService.findUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user
    const userId = await AuthService.createUser({
      email: userData.email,
      password: userData.password,
      role: userData.role,
      profile: userData.profile,
      driver_profile: userData.driver_profile,
    });
    
    // Get the created user to return full details
    const createdUser = await AuthService.findUserById(userId.toString());
    
    res.status(201).json({
      message: 'User created successfully',
      user: createdUser,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Handle Zod validation errors
    if (error.errors && Array.isArray(error.errors)) {
      const validationErrors = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Handle other errors
    res.status(500).json({ 
      error: 'Failed to create user',
      details: error.message || 'Unknown error'
    });
  }
};

// Update user
export const handleUpdateUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = updateUserSchema.parse(req.body);

    // Check if user exists
    const existingUser = await AuthService.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user basic info
    if (updateData.email || updateData.role || updateData.status) {
      const userUpdates: any[] = [];
      const userParams: any[] = [];

      if (updateData.email) {
        // Check if email is already taken by another user
        const emailUser = await AuthService.findUserByEmail(updateData.email);
        if (emailUser && emailUser.id !== id) {
          return res.status(400).json({ error: 'Email already taken' });
        }
        userUpdates.push('email = ?');
        userParams.push(updateData.email);
      }

      if (updateData.role) {
        userUpdates.push('role = ?');
        userParams.push(updateData.role);
      }

      if (updateData.status) {
        userUpdates.push('status = ?');
        userParams.push(updateData.status);
      }

      if (userUpdates.length > 0) {
        userUpdates.push('updated_at = CURRENT_TIMESTAMP');
        userParams.push(id);
        
        await pool.execute(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
          userParams
        );
      }
    }

    // Update profile
    if (updateData.profile) {
      const profile = updateData.profile;
      const profileUpdates: string[] = [];
      const profileParams: any[] = [];

      Object.entries(profile).forEach(([key, value]) => {
        if (value !== undefined) {
          profileUpdates.push(`${key} = ?`);
          profileParams.push(value);
        }
      });

      if (profileUpdates.length > 0) {
        profileUpdates.push('updated_at = CURRENT_TIMESTAMP');
        profileParams.push(id);
        
        await pool.execute(
          `UPDATE profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`,
          profileParams
        );
      }
    }

    // Update driver profile
    if (updateData.driver_profile) {
      const driverProfile = updateData.driver_profile;
      const driverUpdates: string[] = [];
      const driverParams: any[] = [];

      Object.entries(driverProfile).forEach(([key, value]) => {
        if (value !== undefined) {
          driverUpdates.push(`${key} = ?`);
          driverParams.push(value);
        }
      });

      if (driverUpdates.length > 0) {
        driverUpdates.push('updated_at = CURRENT_TIMESTAMP');
        driverParams.push(id);
        
        await pool.execute(
          `UPDATE driver_profiles SET ${driverUpdates.join(', ')} WHERE user_id = ?`,
          driverParams
        );
      }
    }

    // Get updated user
    const updatedUser = await AuthService.findUserById(id);
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
export const handleDeleteUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await AuthService.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of the logged-in admin
    if ((req as any).user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user (cascade delete will handle related records)
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user statistics
export const handleGetUserStats: RequestHandler = async (req, res) => {
  try {
    const queries = await Promise.all([
      await pool.execute('SELECT COUNT(*) as total FROM users'),
      await pool.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role'),
      await pool.execute('SELECT status, COUNT(*) as count FROM users GROUP BY status'),
      await pool.execute('SELECT COUNT(*) as new_users FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
    ]);

    const [totalResult, roleResult, statusResult, newUsersResult] = queries;
    
    const total = (totalResult as any[])[0].total;
    const roleStats = (roleResult as any[]).reduce((acc, row: any) => {
      acc[row.role] = row.count;
      return acc;
    }, {} as Record<string, number>);
    const statusStats = (statusResult as any[]).reduce((acc, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);
    const newUsers = (newUsersResult as any[])[0].new_users;

    res.json({
      total,
      byRole: roleStats,
      byStatus: statusStats,
      newUsersLast30Days: newUsers,
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
};
