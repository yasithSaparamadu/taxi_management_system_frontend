import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Car, Save, Upload, X, Eye, Camera, Check } from 'lucide-react';
import { CreateVehicleRequest } from '@shared/api';

interface VehicleFormData extends CreateVehicleRequest {
  image_url: string;
  image_file?: File;
}

export default function AdminVehicleRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    make: '',
    model: '',
    year: undefined,
    color: '',
    plate: '',
    vin: '',
    capacity: undefined,
    status: 'active',
    image_url: ''
  });

  const [uploadFiles, setUploadFiles] = useState({
    image_file: null as File | null,
    registration_doc: null as File | null,
    insurance_doc: null as File | null
  });

  const handleInputChange = (field: keyof VehicleFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Vehicle name is required');
      return;
    }
    if (!formData.make.trim()) {
      setError('Make is required');
      return;
    }
    if (!formData.model.trim()) {
      setError('Model is required');
      return;
    }
    if (!formData.plate.trim()) {
      setError('License plate is required');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Handle file upload first
      let imageUrl = formData.image_url;
      let registrationDocUrl = '';
      let insuranceDocUrl = '';
      
      if (uploadFiles.image_file || uploadFiles.registration_doc || uploadFiles.insurance_doc) {
        const uploadFormData = new FormData();
        
        if (uploadFiles.image_file) {
          uploadFormData.append('vehicle_image', uploadFiles.image_file);
        }
        if (uploadFiles.registration_doc) {
          uploadFormData.append('registration_doc', uploadFiles.registration_doc);
        }
        if (uploadFiles.insurance_doc) {
          uploadFormData.append('insurance_doc', uploadFiles.insurance_doc);
        }

        const uploadResponse = await fetch('/api/upload/vehicle-documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          throw new Error('Vehicle document upload failed');
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.files.vehicle_image_url) {
          imageUrl = uploadData.files.vehicle_image_url;
        }
        if (uploadData.files.registration_doc_url) {
          registrationDocUrl = uploadData.files.registration_doc_url;
        }
        if (uploadData.files.insurance_doc_url) {
          insuranceDocUrl = uploadData.files.insurance_doc_url;
        }
      }

      const requestData: CreateVehicleRequest = {
        name: formData.name,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        color: formData.color,
        plate: formData.plate,
        vin: formData.vin,
        capacity: formData.capacity,
        status: formData.status
      };

      // Include image_url if uploaded
      if (imageUrl) {
        (requestData as any).image_url = imageUrl;
      }

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        const vehicleId = data.id;
        
        // Save uploaded documents to vehicle_documents table
        if (registrationDocUrl || insuranceDocUrl) {
          const documentPromises = [];
          
          if (registrationDocUrl) {
            documentPromises.push(
              fetch(`/api/vehicles/${vehicleId}/documents`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  type: 'registration',
                  title: 'Vehicle Registration Document',
                  file_url: registrationDocUrl
                })
              })
            );
          }
          
          if (insuranceDocUrl) {
            documentPromises.push(
              fetch(`/api/vehicles/${vehicleId}/documents`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  type: 'insurance',
                  title: 'Vehicle Insurance Document',
                  file_url: insuranceDocUrl
                })
              })
            );
          }
          
          // Wait for all documents to be saved
          await Promise.all(documentPromises);
        }

        setSuccess('Vehicle created successfully!');
        setFormData({
          name: '',
          make: '',
          model: '',
          year: undefined,
          color: '',
          plate: '',
          vin: '',
          capacity: undefined,
          status: 'active',
          image_url: ''
        });
        setUploadFiles({
          image_file: null,
          registration_doc: null,
          insurance_doc: null
        });
      } else {
        setError(data.error || 'Failed to create vehicle');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create a local state for image preview
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  const handleImageFileChange = (file: File | null) => {
    setUploadFiles({ ...uploadFiles, image_file: file });
    if (file) {
      // Create a temporary preview URL for the selected file
      const tempUrl = URL.createObjectURL(file);
      setPreviewImageUrl(tempUrl);
    } else {
      setPreviewImageUrl('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vehicle Registration</h1>
              <p className="text-sm text-gray-600">Register a new vehicle in the fleet</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
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
                <Car className="h-5 w-5 mr-2" />
                Vehicle Information
              </CardTitle>
              <CardDescription>
                Fill in the details below to register a new vehicle
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
                {/* Basic Vehicle Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Vehicle Name</Label>
                      <Input
                        id="name"
                        placeholder="Toyota Prius 2018"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => handleInputChange('status', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="make">Make</Label>
                      <Input
                        id="make"
                        placeholder="Toyota"
                        value={formData.make}
                        onChange={(e) => handleInputChange('make', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        placeholder="Prius"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        placeholder="2018"
                        value={formData.year || ''}
                        onChange={(e) => handleInputChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>

                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        placeholder="Silver"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="plate">License Plate</Label>
                      <Input
                        id="plate"
                        placeholder="ABC-1234"
                        value={formData.plate}
                        onChange={(e) => handleInputChange('plate', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="vin">VIN Number</Label>
                      <Input
                        id="vin"
                        placeholder="1HGBH41JXMN109186"
                        value={formData.vin}
                        onChange={(e) => handleInputChange('vin', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="capacity">Capacity (Seats)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="4"
                        value={formData.capacity || ''}
                        onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Image */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Vehicle Image</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_image" className="text-sm font-medium">Vehicle Photo</Label>
                    <div className="flex items-start space-x-6">
                      {/* Image Preview */}
                      <div className="flex-shrink-0">
                        {previewImageUrl || formData.image_url ? (
                          <div className="relative group">
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                              <img 
                                src={previewImageUrl || formData.image_url} 
                                alt="Vehicle preview" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '';
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(previewImageUrl || formData.image_url, '_blank')}
                                className="text-white hover:bg-white hover:bg-opacity-20"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Upload Controls */}
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Upload New Image</Label>
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)}
                              className="sr-only"
                              id="vehicle_image_upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('vehicle_image_upload')?.click()}
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Image File
                            </Button>
                          </div>
                        </div>
                        
                        {uploadFiles.image_file && (
                          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800">{uploadFiles.image_file.name}</span>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Or Enter Image URL</Label>
                          <div className="flex space-x-2">
                            <Input
                              value={formData.image_url}
                              onChange={(e) => handleInputChange('image_url', e.target.value)}
                              placeholder="/uploads/images/vehicle.jpg"
                              className="flex-1"
                            />
                            {formData.image_url && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(formData.image_url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Documents */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Vehicle Documents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="registration_doc">Registration Document</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadFiles({ ...uploadFiles, registration_doc: e.target.files?.[0] || null })}
                          className="flex-1"
                        />
                        {uploadFiles.registration_doc && (
                          <span className="text-sm text-green-600">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Upload vehicle registration document (PDF, DOC, or image)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="insurance_doc">Insurance Document</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadFiles({ ...uploadFiles, insurance_doc: e.target.files?.[0] || null })}
                          className="flex-1"
                        />
                        {uploadFiles.insurance_doc && (
                          <span className="text-sm text-green-600">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Upload vehicle insurance document (PDF, DOC, or image)</p>
                    </div>
                  </div>
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
                    {loading ? 'Creating...' : 'Create Vehicle'}
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
