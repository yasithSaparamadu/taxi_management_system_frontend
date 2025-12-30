import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from '../store/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Calendar } from "lucide-react";

export default function BookingDashboard() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Booking Register',
      description: 'Create new bookings and manage customer requests. Add trip details, assign drivers, and schedule rides.',
      icon: Plus,
      path: '/booking-dashboard/register',
      color: 'bg-blue-500'
    },
    {
      title: 'Booking Management',
      description: 'View, edit, and manage existing bookings. Update driver assignments, change schedules, and track trip status.',
      icon: Calendar,
      path: '/booking-dashboard/management',
      color: 'bg-green-500'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Booking Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.profile?.first_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" type="button" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Booking Admin
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
              <Button onClick={() => navigate('/booking-dashboard/register')}>
                <Plus className="h-4 w-4 mr-2" />
                Register Booking
              </Button>
              <Button variant="outline" onClick={() => navigate('/booking-dashboard/management')}>
                <Calendar className="h-4 w-4 mr-2" />
                Manage Bookings
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
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      Go to {item.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
