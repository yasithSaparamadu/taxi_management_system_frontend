import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Car, Search, Edit, Eye, Upload, X, Camera, Check, Users, Calendar } from 'lucide-react';
import { Vehicle, CreateVehicleRequest } from '@shared/api';

export default function AdminVehicleManagement() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [vehicleDocuments, setVehicleDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [editForm, setEditForm] = useState<CreateVehicleRequest>({
    name: '',
    make: '',
    model: '',
    year: undefined,
    color: '',
    plate: '',
    vin: '',
    capacity: undefined,
    status: 'active'
  });

  const [uploadFiles, setUploadFiles] = useState({
    image_file: null as File | null,
    registration_doc: null as File | null,
    insurance_doc: null as File | null
  });
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const data = await response.json();
      setVehicles(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleDocuments = async (vehicleId: number) => {
    setLoadingDocuments(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // If documents endpoint doesn't exist or fails, set empty array
        setVehicleDocuments([]);
        return;
      }

      const data = await response.json();
      setVehicleDocuments(data.documents || []);
    } catch (err: any) {
      // Don't show error for documents, just set empty array
      setVehicleDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchSingleVehicle = async (vehicleId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.vehicle;
      }
      return null;
    } catch (err: any) {
      return null;
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditForm({
      name: vehicle.name,
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || undefined,
      color: vehicle.color || '',
      plate: vehicle.plate || '',
      vin: vehicle.vin || '',
      capacity: vehicle.capacity || undefined,
      status: vehicle.status
    });
    setUploadFiles({
      image_file: null,
      registration_doc: null,
      insurance_doc: null
    });
    // Reset preview image when opening edit modal
    setPreviewImageUrl('');
    
    // Fetch vehicle documents
    fetchVehicleDocuments(vehicle.id);
    
    setShowEditModal(true);
  };

  const handleDocumentOpen = (fileUrl: string) => {
    // Open document in a new window without affecting the current state
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleImageOpen = (imageUrl: string) => {
    // Open image in a new window without affecting the current state
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Handle file upload first
      let imageUrl = '';
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

      const response = await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editForm,
          // Only update image_url if a new image was uploaded
          // Otherwise preserve the existing image_url
          image_url: imageUrl || selectedVehicle.image_url || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update vehicle');
      }

      // Save uploaded documents to vehicle_documents table
      if (registrationDocUrl || insuranceDocUrl) {
        const documentPromises = [];
        
        if (registrationDocUrl) {
          documentPromises.push(
            fetch(`/api/vehicles/${selectedVehicle.id}/documents`, {
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
            fetch(`/api/vehicles/${selectedVehicle.id}/documents`, {
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

      // Refresh the vehicle data to show updated image
      const updatedVehicle = await fetchSingleVehicle(selectedVehicle.id);
      if (updatedVehicle) {
        setSelectedVehicle(updatedVehicle);
        // Update the vehicle in the list as well
        setVehicles(prev => prev.map(v => 
          v.id === selectedVehicle.id ? updatedVehicle : v
        ));
      }

      setShowEditModal(false);
      fetchVehicles(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vehicle Management</h1>
              <p className="text-sm text-gray-600">View and manage fleet vehicles</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate('/admin/vehicles/register')}>
                <Car className="h-4 w-4 mr-2" />
                Register Vehicle
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, make, model, plate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicles List */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Vehicles ({filteredVehicles.length})</CardTitle>
              <CardDescription>
                All vehicles registered in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading vehicles...</p>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No vehicles found</p>
                  <Button onClick={() => navigate('/admin/vehicles/register')} className="mt-4">
                    Register First Vehicle
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Vehicle</th>
                        <th className="text-left py-3 px-4">Details</th>
                        <th className="text-left py-3 px-4">Capacity</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((vehicle) => (
                        <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {vehicle.image_url ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors">
                                  <img 
                                    src={vehicle.image_url} 
                                    alt={vehicle.name}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                                    onClick={() => handleImageOpen(vehicle.image_url)}
                                    onError={(e) => {
                                      e.currentTarget.src = '';
                                      e.currentTarget.style.display = 'none';
                                      // Fallback to icon
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg></div>';
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                  <Car className="h-5 w-5 text-blue-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{vehicle.name}</p>
                                <p className="text-sm text-gray-500">{vehicle.plate || 'No Plate'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                              <p className="text-gray-500">{vehicle.year} • {vehicle.color || 'N/A'}</p>
                              {vehicle.vin && <p className="text-gray-500 text-xs">VIN: {vehicle.vin}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-sm">
                              <Users className="h-4 w-4 mr-1 text-gray-400" />
                              {vehicle.capacity || 'N/A'} seats
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={vehicle.status === 'active' ? 'default' : 'secondary'}
                              className={vehicle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {vehicle.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(vehicle)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Vehicle Details</h2>
                    <p className="text-sm text-gray-500">Edit vehicle information</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              <form onSubmit={handleUpdate} className="space-y-6">
                {/* Vehicle Overview */}
                <div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center border-4 border-white shadow-lg">
                    <Car className="h-8 w-8 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editForm.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {editForm.make} {editForm.model} {editForm.year}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge 
                        variant={editForm.status === 'active' ? 'default' : 'secondary'}
                        className={editForm.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {editForm.status}
                      </Badge>
                      <span className="text-sm text-gray-500">ID: #{selectedVehicle.id}</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      <Car className="h-4 w-4 mr-2" />
                      Basic Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit_name" className="text-sm font-medium">Vehicle Name</Label>
                        <Input
                          id="edit_name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit_status" className="text-sm font-medium">Status</Label>
                        <Select value={editForm.status} onValueChange={(value: 'active' | 'inactive') => setEditForm({ ...editForm, status: value })}>
                          <SelectTrigger className="mt-1">
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
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Vehicle Details
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit_make" className="text-sm font-medium">Make</Label>
                        <Input
                          id="edit_make"
                          value={editForm.make}
                          onChange={(e) => setEditForm({ ...editForm, make: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit_model" className="text-sm font-medium">Model</Label>
                        <Input
                          id="edit_model"
                          value={editForm.model}
                          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_year" className="text-sm font-medium">Year</Label>
                      <Input
                        id="edit_year"
                        type="number"
                        value={editForm.year || ''}
                        onChange={(e) => setEditForm({ ...editForm, year: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="mt-1"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit_color" className="text-sm font-medium">Color</Label>
                      <Input
                        id="edit_color"
                        value={editForm.color}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_plate" className="text-sm font-medium">License Plate</Label>
                      <Input
                        id="edit_plate"
                        value={editForm.plate}
                        onChange={(e) => setEditForm({ ...editForm, plate: e.target.value })}
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit_capacity" className="text-sm font-medium">Capacity (Seats)</Label>
                      <Input
                        id="edit_capacity"
                        type="number"
                        value={editForm.capacity || ''}
                        onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="mt-1"
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>
                </div>

                {/* VIN */}
                <div className="space-y-2">
                  <Label htmlFor="edit_vin" className="text-sm font-medium">VIN Number</Label>
                  <Input
                    id="edit_vin"
                    value={editForm.vin}
                    onChange={(e) => setEditForm({ ...editForm, vin: e.target.value })}
                    placeholder="1HGBH41JXMN109186"
                  />
                </div>

                {/* Vehicle Image and Documents Upload */}
                <div className="space-y-6">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Vehicle Images & Documents
                  </h4>
                  
                  {/* Vehicle Image Upload */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-700">Vehicle Photo</h5>
                    <div className="flex items-start space-x-6">
                      {/* Image Preview */}
                      <div className="flex-shrink-0">
                        {previewImageUrl || selectedVehicle.image_url ? (
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                              <img 
                                src={previewImageUrl || selectedVehicle.image_url} 
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
                                onClick={() => handleImageOpen(previewImageUrl || selectedVehicle.image_url)}
                                className="text-white hover:bg-white hover:bg-opacity-20"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Camera className="h-6 w-6 text-gray-400" />
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
                              id="edit_vehicle_image_upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('edit_vehicle_image_upload')?.click()}
                              className="w-full"
                            >
                              <Upload className="h-3 w-3 mr-2" />
                              Choose Image File
                            </Button>
                          </div>
                        </div>
                        
                        {uploadFiles.image_file && (
                          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-800">{uploadFiles.image_file.name}</span>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Existing Documents Display */}
                  {vehicleDocuments.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-700">Uploaded Documents:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {vehicleDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                doc.type === 'registration' ? 'bg-blue-100 text-blue-800' :
                                doc.type === 'insurance' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {doc.type === 'registration' ? 'R' : 
                                 doc.type === 'insurance' ? 'I' : 'D'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDocumentOpen(doc.file_url)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Registration Document Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="edit_registration_doc" className="text-sm font-medium">Registration Document</Label>
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
                      <p className="text-xs text-gray-500">Update registration document</p>
                    </div>

                    {/* Insurance Document Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="edit_insurance_doc" className="text-sm font-medium">Insurance Document</Label>
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
                      <p className="text-xs text-gray-500">Update insurance document</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          Update Vehicle
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
