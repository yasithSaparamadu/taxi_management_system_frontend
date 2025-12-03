import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, selectIsAuthenticated, selectIsLoading, selectUser, clearAuth } from '../store/auth';
import type { AppDispatch } from '../store/auth';
import { UserRole } from '@shared/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const user = useSelector(selectUser);
  const token = localStorage.getItem('token');

  // Check authentication and get user info if token exists but no user data
  useEffect(() => {
    if (token && !user && !isLoading) {
      dispatch(getCurrentUser())
        .unwrap()
        .catch((error) => {
          // If getting user fails, clear auth and redirect to login
          dispatch(clearAuth());
          navigate(fallbackPath, { 
            state: { from: location.pathname },
            replace: true 
          });
        });
    }
  }, [token, user, isLoading, dispatch, navigate, fallbackPath, location.pathname]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !token) {
      navigate(fallbackPath, { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [isAuthenticated, isLoading, token, navigate, fallbackPath, location.pathname]);

  // Check role-based access
  useEffect(() => {
    if (isAuthenticated && user && requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      if (!allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on user role
        switch (user.role) {
          case 'admin':
            navigate('/', { replace: true });
            break;
          case 'driver':
            navigate('/driver', { replace: true });
            break;
          case 'customer':
            navigate('/customer', { replace: true });
            break;
          default:
            navigate('/login', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, requiredRole, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading || (token && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or if role check fails
  if (!isAuthenticated || !user) {
    return null;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}

// Specific role-based protected routes
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
}

export function DriverRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="driver">{children}</ProtectedRoute>;
}

export function CustomerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="customer">{children}</ProtectedRoute>;
}

export function AdminOrDriverRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole={['admin', 'driver']}>{children}</ProtectedRoute>;
}

export function AdminOrCustomerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole={['admin', 'customer']}>{children}</ProtectedRoute>;
}

export function DriverOrCustomerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole={['driver', 'customer']}>{children}</ProtectedRoute>;
}
