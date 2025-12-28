import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Car, User, Mail, Phone, Save, FileText, Badge, Upload, X } from 'lucide-react';

interface DriverFormData {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  address: string;
  license_number: string;
  id_proof_url: string;
  work_permit_url: string;
  employment_status: 'active' | 'inactive' | 'suspended';
  id_proof_file?: File;
  work_permit_file?: File;
}

export default function AdminDriverRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<DriverFormData>({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    address: '',
    license_number: '',
    id_proof_url: '',
    work_permit_url: '',
    employment_status: 'active'
  });

  const [uploadProgress, setUploadProgress] = useState<{ id_proof: number; work_permit: number }>({
    id_proof: 0,
    work_permit: 0
  });

  const handleInputChange = (field: keyof DriverFormData, value: string | File) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleFileChange = (field: 'id_proof_file' | 'work_permit_file', file: File | undefined) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    setError('');
    setSuccess('');
  };

  const removeFile = (field: 'id_proof_file' | 'work_permit_file') => {
    setFormData(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
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

    if (!formData.license_number.trim()) {
      setError('License number is required for drivers');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Upload documents first if they exist
      let idProofUrl = formData.id_proof_url;
      let workPermitUrl = formData.work_permit_url;
      
      if (formData.id_proof_file || formData.work_permit_file) {
        const uploadFormData = new FormData();
        
        if (formData.id_proof_file) {
          uploadFormData.append('id_proof', formData.id_proof_file);
        }
        
        if (formData.work_permit_file) {
          uploadFormData.append('work_permit', formData.work_permit_file);
        }

        const uploadResponse = await fetch('/api/upload/driver-documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.error || 'Document upload failed');
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.files.id_proof_url) {
          idProofUrl = uploadData.files.id_proof_url;
        }
        if (uploadData.files.work_permit_url) {
          workPermitUrl = uploadData.files.work_permit_url;
        }
      }

      // Debug: Log the data being sent
      const requestData: any = {
        email: formData.email,
        password: 'defaultPassword123', // Set default password for admin-created drivers
        role: 'driver',
        phone: formData.phone,
        profile: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          address: formData.address
        }
      };

      // Only add driver_profile if there's data
      const driverProfile: any = {
        license_number: formData.license_number,
        employment_status: formData.employment_status
      };

      // Only add document URLs if they exist and are valid
      if (idProofUrl && idProofUrl.trim() !== '') {
        driverProfile.id_proof_url = idProofUrl;
      }
      if (workPermitUrl && workPermitUrl.trim() !== '') {
        driverProfile.work_permit_url = workPermitUrl;
      }

      requestData.driver_profile = driverProfile;
      
      console.log('Sending driver data:', requestData);
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
        setSuccess('Driver created successfully!');
        setFormData({
          email: '',
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
        console.error('Validation errors:', data.details);
        setError(data.error || 'Failed to create driver');
        if (data.details) {
          const errorMessages = data.details.map((detail: any) => `${detail.field}: ${detail.message}`).join(', ');
          setError(`Validation failed: ${errorMessages}`);
        }
      }
    } catch (err: any) {
      console.error('Network error:', err);
      setError(err.message || 'Network error. Please try again.');
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
                        <Label htmlFor="id_proof_file">ID Proof Document</Label>
                        <div className="mt-1">
                          {formData.id_proof_file ? (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-green-600" />
                                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                                  {formData.id_proof_file.name}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile('id_proof_file')}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                id="id_proof_file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => handleFileChange('id_proof_file', e.target.files?.[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 transition-colors">
                                <Upload className="h-6 w-6 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">Click to upload ID proof</span>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, JPG, PNG, or Word (max 5MB)
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="work_permit_file">Work Permit Document</Label>
                        <div className="mt-1">
                          {formData.work_permit_file ? (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-green-600" />
                                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                                  {formData.work_permit_file.name}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile('work_permit_file')}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                id="work_permit_file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => handleFileChange('work_permit_file', e.target.files?.[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 transition-colors">
                                <Upload className="h-6 w-6 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">Click to upload work permit</span>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, JPG, PNG, or Word (max 5MB)
                          </p>
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
