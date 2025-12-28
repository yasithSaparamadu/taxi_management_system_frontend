import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Car, Calendar, Plus, ArrowLeft, User } from 'lucide-react';

export default function AdminDashboard() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Driver Registration',
      description: 'Register new drivers and manage profiles',
      icon: Car,
      path: '/admin/drivers',
      color: 'bg-green-500'
    },
    {
      title: 'Driver Management',
      description: 'View and edit existing drivers',
      icon: Car,
      path: '/admin/drivers/manage',
      color: 'bg-orange-500'
    },
    {
      title: 'Customer Registration',
      description: 'Register new customers and manage profiles',
      icon: User,
      path: '/admin/customers',
      color: 'bg-blue-500'
    },
    {
      title: 'Customer Management',
      description: 'View and edit existing customers',
      icon: User,
      path: '/admin/customers/manage',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.profile?.first_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Administrator
              </Badge>
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
              <Button onClick={() => navigate('/admin/drivers')}>
                <Plus className="h-4 w-4 mr-2" />
                Register Driver
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/drivers/manage')}>
                <Car className="h-4 w-4 mr-2" />
                Manage Drivers
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/customers')}>
                <Plus className="h-4 w-4 mr-2" />
                Register Customer
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/customers/manage')}>
                <User className="h-4 w-4 mr-2" />
                Manage Customers
              </Button>
            </div>
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

          {/* Recent Activity */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system activities and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity to display</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
