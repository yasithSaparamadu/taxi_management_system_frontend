import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Car, Calendar, Plus, ArrowLeft, User, Settings, Clock, Users, FileText, Camera } from 'lucide-react';

export default function AdminDashboard() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Fetch recent activities
  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    setLoadingActivities(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        setRecentActivities([]);
        return;
      }
      
      // Fetch recent activities from different endpoints
      const activities = [];
      const seenIds = new Set(); // Track seen IDs to prevent duplicates
      
      // Fetch recent drivers
      try {
        console.log('Fetching drivers...');
        const driversResponse = await fetch('/api/drivers?limit=20', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Drivers response status:', driversResponse.status);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          console.log('Drivers data:', driversData);
          console.log('Drivers items count:', driversData.items?.length || 0);
          driversData.items?.slice(0, 10).forEach((driver: any) => {
            const newId = `driver-${driver.id}`;
            const updateId = `driver-update-${driver.id}`;
            
            // Only add new driver activity if not seen
            if (!seenIds.has(newId)) {
              activities.push({
                id: newId,
                type: 'driver',
                title: `New driver registered: ${driver.first_name} ${driver.last_name}`,
                description: `License: ${driver.license_number}`,
                time: new Date(driver.created_at).toISOString(),
                icon: 'Users',
                color: 'text-blue-600'
              });
              seenIds.add(newId);
            }
            
            // Only add update activity if different from creation and not seen
            if (driver.updated_at && driver.updated_at !== driver.created_at && !seenIds.has(updateId)) {
              activities.push({
                id: updateId,
                type: 'driver_update',
                title: `Driver updated: ${driver.first_name} ${driver.last_name}`,
                description: `Status: ${driver.status}`,
                time: new Date(driver.updated_at).toISOString(),
                icon: 'Settings',
                color: 'text-orange-600'
              });
              seenIds.add(updateId);
            }
          });
        } else {
          console.error('Drivers API failed:', driversResponse.status, driversResponse.statusText);
        }
      } catch (error) {
        console.error('Drivers API error:', error);
      }

      // Fetch recent vehicles
      try {
        const vehiclesResponse = await fetch('/api/vehicles?limit=20', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          console.log('Vehicles data:', vehiclesData);
          vehiclesData.items?.slice(0, 10).forEach((vehicle: any) => {
            const newId = `vehicle-${vehicle.id}`;
            const updateId = `vehicle-update-${vehicle.id}`;
            
            // Only add new vehicle activity if not seen
            if (!seenIds.has(newId)) {
              activities.push({
                id: newId,
                type: 'vehicle',
                title: `New vehicle added: ${vehicle.name}`,
                description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
                time: new Date(vehicle.created_at).toISOString(),
                icon: 'Car',
                color: 'text-green-600'
              });
              seenIds.add(newId);
            }
            
            // Only add update activity if different from creation and not seen
            if (vehicle.updated_at && vehicle.updated_at !== vehicle.created_at && !seenIds.has(updateId)) {
              activities.push({
                id: updateId,
                type: 'vehicle_update',
                title: `Vehicle updated: ${vehicle.name}`,
                description: `${vehicle.make} ${vehicle.model} - Status: ${vehicle.status}`,
                time: new Date(vehicle.updated_at).toISOString(),
                icon: 'Settings',
                color: 'text-orange-600'
              });
              seenIds.add(updateId);
            }
          });
        } else {
          console.error('Vehicles API failed:', vehiclesResponse.status, vehiclesResponse.statusText);
        }
      } catch (error) {
        console.error('Vehicles API error:', error);
      }

      // Fetch recent customers
      try {
        console.log('Fetching customers...');
        const customersResponse = await fetch('/api/users?limit=20', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Customers response status:', customersResponse.status);
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          console.log('Customers data:', customersData);
          console.log('Customers items count:', customersData.items?.length || 0);
          customersData.items?.slice(0, 10).forEach((customer: any) => {
            const newId = `customer-${customer.id}`;
            const updateId = `customer-update-${customer.id}`;
            
            // Only add new customer activity if not seen
            if (!seenIds.has(newId)) {
              activities.push({
                id: newId,
                type: 'customer',
                title: `New customer registered: ${customer.first_name} ${customer.last_name}`,
                description: `Email: ${customer.email}`,
                time: new Date(customer.created_at).toISOString(),
                icon: 'User',
                color: 'text-purple-600'
              });
              seenIds.add(newId);
            }
            
            // Only add update activity if different from creation and not seen
            if (customer.updated_at && customer.updated_at !== customer.created_at && !seenIds.has(updateId)) {
              activities.push({
                id: updateId,
                type: 'customer_update',
                title: `Customer updated: ${customer.first_name} ${customer.last_name}`,
                description: `Status: ${customer.status || 'Active'}`,
                time: new Date(customer.updated_at).toISOString(),
                icon: 'Settings',
                color: 'text-orange-600'
              });
              seenIds.add(updateId);
            }
          });
        } else {
          console.error('Customers API failed:', customersResponse.status, customersResponse.statusText);
        }
      } catch (error) {
        console.error('Customers API error:', error);
      }

      // Sort by time (most recent first)
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      console.log('Final activities:', activities);
      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      setRecentActivities([{
        id: 'error',
        type: 'error',
        title: 'Failed to load activities',
        description: 'Please check your connection and try again',
        time: new Date().toISOString(),
        icon: 'Clock',
        color: 'text-red-600'
      }]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const formatTimeAgo = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  const getActivityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users className="h-4 w-4" />;
      case 'Car': return <Car className="h-4 w-4" />;
      case 'User': return <User className="h-4 w-4" />;
      case 'FileText': return <FileText className="h-4 w-4" />;
      case 'Camera': return <Camera className="h-4 w-4" />;
      case 'Settings': return <Settings className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

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
    },
    {
      title: 'Vehicle Registration',
      description: 'Register new vehicles in the fleet',
      icon: Settings,
      path: '/admin/vehicles/register',
      color: 'bg-indigo-500'
    },
    {
      title: 'Vehicle Management',
      description: 'View and manage fleet vehicles',
      icon: Settings,
      path: '/admin/vehicles/manage',
      color: 'bg-pink-500'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.profile?.first_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" type="button" onClick={() => navigate('/')}>
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
            <div className="flex flex-wrap gap-4">
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
              <Button variant="outline" onClick={() => navigate('/admin/vehicles/register')}>
                <Plus className="h-4 w-4 mr-2" />
                Register Vehicle
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/vehicles/manage')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Vehicles
              </Button>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                {loadingActivities ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading recent activities...</p>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                    <p>No recent activity to display</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'driver' ? 'bg-blue-100' :
                          activity.type === 'driver_update' ? 'bg-orange-100' :
                          activity.type === 'vehicle' ? 'bg-green-100' :
                          activity.type === 'vehicle_update' ? 'bg-orange-100' :
                          activity.type === 'customer' ? 'bg-purple-100' :
                          activity.type === 'customer_update' ? 'bg-purple-100' :
                          activity.type === 'error' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          <span className={activity.color}>
                            {getActivityIcon(activity.icon)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                              {formatTimeAgo(activity.time)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
