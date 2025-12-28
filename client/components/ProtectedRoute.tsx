import React, { useEffect, useRef } from 'react';
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
  const hasAttemptedAuth = useRef(false);

  // Check authentication and get user info if token exists but no user data
  useEffect(() => {
    if (token && !user && !isLoading && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Auth check timeout - clearing auth and redirecting');
        dispatch(clearAuth());
        navigate(fallbackPath, { 
          state: { from: location.pathname },
          replace: true 
        });
      }, 5000); // 5 second timeout

      dispatch(getCurrentUser())
        .unwrap()
        .then(() => {
          clearTimeout(timeoutId);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.log('Auth check failed:', error);
          // If getting user fails, clear auth and redirect to login
          dispatch(clearAuth());
          navigate(fallbackPath, { 
            state: { from: location.pathname },
            replace: true 
          });
        });
    }
  }, [token, user, isLoading]); // Remove dispatch, navigate, fallbackPath, location.pathname to prevent infinite loops

  // Reset auth attempt ref when token changes
  useEffect(() => {
    if (!token) {
      hasAttemptedAuth.current = false;
    }
  }, [token]);

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

  // Show loading spinner while checking authentication (but not if we've already attempted auth)
  if (isLoading || (token && !user && !hasAttemptedAuth.current)) {
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
    // If we have a token but no user after auth attempt, show error or redirect
    if (token && hasAttemptedAuth.current) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 mb-4">Authentication failed</p>
            <button 
              onClick={() => {
                dispatch(clearAuth());
                navigate('/login', { replace: true });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }
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
