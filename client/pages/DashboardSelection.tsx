import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearAuth } from '../store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Calendar, 
  FileText, 
  TrendingUp,
  Settings,
  UserCheck
} from 'lucide-react';

interface DashboardOption {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  features: string[];
}

export default function DashboardSelection() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const dashboardOptions: DashboardOption[] = [
    
    {
      id: 'admin',
      title: 'Admin Dashboard',
      description: 'User management, registration, and administrative tools',
      path: '/admin',
      icon: Settings,
      badge: 'Admin',
      features: ['User Registration', 'Driver Registration', 'User Management', 'Admin Settings']
    },
    {
      id: 'bookings',
      title: 'Bookings Dashboard',
      description: 'Focused booking management and scheduling',
      path: '/bookings',
      icon: Calendar,
      badge: 'Operations',
      features: ['Booking Calendar', 'Schedule Management', 'Booking Analytics', 'Customer Communications']
    },
    {
      id: 'reports',
      title: 'Reports Dashboard',
      description: 'Analytics, financial reports, and business insights',
      path: '/reports',
      icon: TrendingUp,
      badge: 'Analytics',
      features: ['Financial Reports', 'Revenue Analytics', 'Performance Metrics', 'Custom Reports']
    },
   
  ];

  const handleDashboardSelect = (dashboard: DashboardOption) => {
    setIsLoading(true);
    // Simulate loading state for better UX
    setTimeout(() => {
      navigate(dashboard.path);
    }, 300);
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'Primary': return 'bg-blue-100 text-blue-800';
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Operations': return 'bg-green-100 text-green-800';
      case 'Analytics': return 'bg-indigo-100 text-indigo-800';
      case 'HR': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
              <p className="text-gray-600 mt-1">Choose your dashboard to get started</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Admin User
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Clear both localStorage and Redux state
                  localStorage.removeItem('token');
                  dispatch(clearAuth());
                  navigate('/login', { replace: true });
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Active Bookings</p>
                  <p className="text-2xl font-bold text-blue-900">24</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Available Vehicles</p>
                  <p className="text-2xl font-bold text-green-900">18</p>
                </div>
                <Car className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Active Drivers</p>
                  <p className="text-2xl font-bold text-purple-900">12</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Today's Revenue</p>
                  <p className="text-2xl font-bold text-orange-900">$3,240</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dashboard Options */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardOptions.map((dashboard) => {
            const Icon = dashboard.icon;
            return (
              <Card 
                key={dashboard.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-blue-200"
                onClick={() => handleDashboardSelect(dashboard)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    {dashboard.badge && (
                      <Badge className={getBadgeColor(dashboard.badge)}>
                        {dashboard.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{dashboard.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {dashboard.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Key Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {dashboard.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {dashboard.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{dashboard.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : `Open ${dashboard.title}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
