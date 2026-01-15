import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Mail, Phone, Save, Upload, X, Eye } from 'lucide-react';

interface CustomerFormData {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  address: string;
  profile_image_url: string;
  profile_image_file?: File;
  is_registered_customer: boolean;
  registered_number: string;
}

export default function AdminCustomerRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<CustomerFormData>({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    address: '',
    profile_image_url: '',
    is_registered_customer: false,
    registered_number: '',
  });

  const [uploadFiles, setUploadFiles] = useState({
    profile_image_file: null as File | null
  });

  const handleInputChange = (field: keyof CustomerFormData, value: string | File) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (checked: boolean | string) => {
    const isChecked = checked === true;
    setFormData(prev => ({
      ...prev,
      is_registered_customer: isChecked,
      registered_number: isChecked ? prev.registered_number : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Handle file upload first
      let profileImageUrl = formData.profile_image_url;
      
      if (uploadFiles.profile_image_file) {
        const uploadFormData = new FormData();
        
        if (uploadFiles.profile_image_file) {
          uploadFormData.append('profile_image', uploadFiles.profile_image_file);
        }

        const uploadResponse = await fetch('/api/upload/driver-documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          throw new Error('Profile image upload failed');
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.files.profile_image_url) {
          profileImageUrl = uploadData.files.profile_image_url;
        }
      }

      // Debug: Log the data being sent
      const requestData: any = {
        email: formData.email,
        password: 'defaultPassword123', // Set default password for admin-created customers
        role: 'customer',
        phone: formData.phone,
        profile: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          address: formData.address,
          profile_image_url: profileImageUrl,
          is_registered_customer: formData.is_registered_customer,
          registered_number: formData.registered_number
        }
      };
      
      console.log('Sending customer data:', requestData);
      console.log('Request body JSON:', JSON.stringify(requestData, null, 2));

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      
      // Debug: Log the response
      console.log('Server response:', data);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        setSuccess('Customer created successfully!');
        setFormData({
          email: '',
          phone: '',
          first_name: '',
          last_name: '',
          address: '',
          profile_image_url: '',
          is_registered_customer: false,
          registered_number: '',
        });
        setUploadFiles({
          profile_image_file: null
        });
      } else {
        setError(data.error || 'Failed to create customer');
        if (data.details) {
          const errorMessages = data.details.map((detail: any) => `${detail.field}: ${detail.message}`).join(', ');
          setError(`Validation failed: ${errorMessages}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Registration</h1>
              <p className="text-sm text-gray-600">Register a new customer in the system</p>
            </div>
            <Button variant="outline" type="button" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
              <CardDescription>
                Fill in the details below to register a new customer
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
                          placeholder="customer@example.com"
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
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Image */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Profile Image</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profile_image">Profile Image</Label>
                    <div className="flex items-center space-x-4">
                      {formData.profile_image_url && (
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                          <img 
                            src={formData.profile_image_url} 
                            alt="Profile preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '';
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex space-x-2">
                          <Input
                            id="profile_image_url"
                            value={formData.profile_image_url}
                            onChange={(e) => handleInputChange('profile_image_url', e.target.value)}
                            placeholder="/uploads/images/profile.jpg"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => formData.profile_image_url && window.open(formData.profile_image_url, '_blank')}
                            disabled={!formData.profile_image_url}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setUploadFiles({ ...uploadFiles, profile_image_file: e.target.files?.[0] || null })}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-500">or upload image</span>
                        </div>
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

                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="is_registered_customer"
                      checked={formData.is_registered_customer}
                      onCheckedChange={handleCheckboxChange}
                    />
                    <Label htmlFor="is_registered_customer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Is this a registered customer?
                    </Label>
                  </div>

                  {formData.is_registered_customer && (
                    <div>
                      <Label htmlFor="registered_number" className="text-sm font-medium">Registered Number *</Label>
                      <Input
                        id="registered_number"
                        type="text"
                        placeholder="Enter registered customer number"
                        value={formData.registered_number}
                        onChange={(e) => handleInputChange('registered_number', e.target.value)}
                        required={formData.is_registered_customer}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Customer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
