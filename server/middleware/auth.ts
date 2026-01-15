import type { Request, Response, NextFunction } from 'express';
import { AuthService, type JWTPayload } from '../services/auth';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
   
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    
    // Verify token format and signature
    const payload = AuthService.verifyToken(token);
   
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }


 
    // Check user status
    if (payload.status !== 'active') {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireAdmin = authorize(['admin']);
export const requireDriver = authorize(['driver']);
export const requireCustomer = authorize(['customer']);
export const requireAdminOrDriver = authorize(['admin', 'driver']);
export const requireAdminOrCustomer = authorize(['admin', 'customer']);
export const requireDriverOrCustomer = authorize(['driver', 'customer']);

// Optional authentication - doesn't fail if no token, but sets user if valid
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);
    
    if (payload && await AuthService.isTokenValid(token) && payload.status === 'active') {
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Optional auth should not fail the request
    next();
  }
};
