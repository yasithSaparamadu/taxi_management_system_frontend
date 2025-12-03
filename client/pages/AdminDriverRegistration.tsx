import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Car, User, Mail, Phone, Lock, Save, FileText, Badge } from 'lucide-react';

interface DriverFormData {
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  first_name: string;
  last_name: string;
  address: string;
  license_number: string;
  id_proof_url: string;
  work_permit_url: string;
  employment_status: 'active' | 'inactive' | 'suspended';
}

export default function AdminDriverRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<DriverFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    first_name: '',
    last_name: '',
    address: '',
    license_number: '',
    id_proof_url: '',
    work_permit_url: '',
    employment_status: 'active'
  });

  const handleInputChange = (field: keyof DriverFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.license_number) {
      setError('License number is required for drivers');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Debug: Log the data being sent
      console.log('Sending driver data:', {
        email: formData.email,
        password: formData.password,
        role: 'driver',
        phone: formData.phone,
        profile: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          address: formData.address
        },
        driver_profile: {
          license_number: formData.license_number,
          id_proof_url: formData.id_proof_url,
          work_permit_url: formData.work_permit_url,
          employment_status: formData.employment_status
        }
      });

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: 'driver',
          phone: formData.phone,
          profile: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            address: formData.address
          },
          driver_profile: {
            license_number: formData.license_number,
            id_proof_url: formData.id_proof_url,
            work_permit_url: formData.work_permit_url,
            employment_status: formData.employment_status
          }
        })
      });

      const data = await response.json();
      
      // Debug: Log the response
      console.log('Server response:', data);

      if (response.ok) {
        setSuccess('Driver created successfully!');
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          first_name: '',
          last_name: '',
          address: '',
          license_number: '',
          id_proof_url: '',
          work_permit_url: '',
          employment_status: 'active'
        });
      } else {
        setError(data.error || 'Failed to create driver');
        if (data.details) {
          console.error('Validation errors:', data.details);
        }
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Driver Registration</h1>
              <p className="text-sm text-gray-600">Register a new driver for the taxi service</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="h-5 w-5 mr-2" />
                  Driver Information
                </CardTitle>
                <CardDescription>
                  Fill in the details below to register a new driver
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="driver@example.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          placeholder="John"
                          value={formData.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          placeholder="Doe"
                          value={formData.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        placeholder="123 Main St, City, State 12345"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Driver Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Driver Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="license_number">License Number</Label>
                        <div className="relative">
                          <Badge className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="license_number"
                            placeholder="DL123456789"
                            value={formData.license_number}
                            onChange={(e) => handleInputChange('license_number', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="employment_status">Employment Status</Label>
                        <Select value={formData.employment_status} onValueChange={(value: 'active' | 'inactive' | 'suspended') => handleInputChange('employment_status', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="id_proof_url">ID Proof URL</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="id_proof_url"
                            type="url"
                            placeholder="https://example.com/id-proof.pdf"
                            value={formData.id_proof_url}
                            onChange={(e) => handleInputChange('id_proof_url', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="work_permit_url">Work Permit URL</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="work_permit_url"
                            type="url"
                            placeholder="https://example.com/work-permit.pdf"
                            value={formData.work_permit_url}
                            onChange={(e) => handleInputChange('work_permit_url', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/admin')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="min-w-[120px]"
                    >
                      {loading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Register Driver
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
