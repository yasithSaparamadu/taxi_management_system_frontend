import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser } from '../store/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Car, Calendar, Clock, User, LogOut, Plus } from 'lucide-react';

export default function CustomerDashboard() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    {
      title: 'Book a Taxi',
      description: 'Book a new taxi ride',
      icon: Car,
      path: '/customer/book',
      color: 'bg-blue-500'
    },
    {
      title: 'My Bookings',
      description: 'View your booking history and upcoming rides',
      icon: Calendar,
      path: '/customer/bookings',
      color: 'bg-green-500'
    },
    {
      title: 'Payment Methods',
      description: 'Manage your payment preferences',
      icon: Clock,
      path: '/customer/payment',
      color: 'bg-purple-500'
    },
    {
      title: 'My Profile',
      description: 'Update your personal information',
      icon: User,
      path: '/customer/profile',
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.profile?.first_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Customer
              </Badge>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex space-x-4">
              <Button onClick={() => navigate('/customer/book')}>
                <Plus className="h-4 w-4 mr-2" />
                Book a Taxi
              </Button>
              <Button variant="outline" onClick={() => navigate('/customer/bookings')}>
                View Bookings
              </Button>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">Scheduled rides</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,240</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={item.title} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(item.path)}
                >
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${item.color} bg-opacity-10 flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${item.color.replace('bg-', 'text-')}`} />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Bookings */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Your latest taxi rides</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p>No recent bookings to display</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
