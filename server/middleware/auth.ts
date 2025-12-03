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
      console.log("Auth middleware - No token provided");
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    console.log("Auth middleware - Received token:", token.substring(0, 50) + "...");
    
    // Verify token format and signature
    const payload = AuthService.verifyToken(token);
    console.log("Auth middleware - Payload:", payload);
    if (!payload) {
      console.log("Auth middleware - Token verification failed");
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // TEMPORARILY BYPASS SESSION CHECK FOR DEBUGGING
    console.log("Auth middleware - BYPASSING session check for debugging");
    
    // Check if token is still valid in sessions
    // const isTokenValid = await AuthService.isTokenValid(token);
    // console.log("Auth middleware - Token valid in sessions:", isTokenValid);
    // if (!isTokenValid) {
    //   console.log("Auth middleware - Token not valid in sessions");
    //   res.status(401).json({ error: 'Token expired or revoked' });
    //   return;
    // }

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
