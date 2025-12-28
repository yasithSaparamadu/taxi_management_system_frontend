import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Car, User, Mail, Phone, Search, Edit, Eye, FileText, Download, Trash2, Upload } from 'lucide-react';

interface Driver {
  id: number;
  email: string;
  phone: string;
  role: string;
  status: string;
  profile: {
    first_name: string;
    last_name: string;
    address: string;
    profile_image_url?: string;
  };
  driver_profile: {
    license_number: string;
    id_proof_url?: string;
    work_permit_url?: string;
    employment_status: string;
  };
}

export default function AdminDriverManagement() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    license_number: '',
    employment_status: 'active' as 'active' | 'inactive' | 'suspended',
    id_proof_url: '',
    work_permit_url: '',
    profile_image_url: ''
  });

  const [uploadFiles, setUploadFiles] = useState({
    id_proof_file: null as File | null,
    work_permit_file: null as File | null,
    profile_image_file: null as File | null
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?role=driver', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch drivers');
      }

      const data = await response.json();
      setDrivers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditForm({
      first_name: driver.profile.first_name || '',
      last_name: driver.profile.last_name || '',
      phone: driver.phone || '',
      address: driver.profile.address || '',
      license_number: driver.driver_profile.license_number || '',
      employment_status: (driver.driver_profile.employment_status || 'active') as 'active' | 'inactive' | 'suspended',
      id_proof_url: driver.driver_profile.id_proof_url || '',
      work_permit_url: driver.driver_profile.work_permit_url || '',
      profile_image_url: driver.profile.profile_image_url || ''
    });
    setUploadFiles({
      id_proof_file: null,
      work_permit_file: null,
      profile_image_file: null
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Handle file uploads first
      let idProofUrl = editForm.id_proof_url;
      let workPermitUrl = editForm.work_permit_url;
      let profileImageUrl = editForm.profile_image_url;
      
      if (uploadFiles.id_proof_file || uploadFiles.work_permit_file || uploadFiles.profile_image_file) {
        const uploadFormData = new FormData();
        
        if (uploadFiles.id_proof_file) {
          uploadFormData.append('id_proof', uploadFiles.id_proof_file);
        }
        
        if (uploadFiles.work_permit_file) {
          uploadFormData.append('work_permit', uploadFiles.work_permit_file);
        }

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
          throw new Error('Document upload failed');
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.files.id_proof_url) {
          idProofUrl = uploadData.files.id_proof_url;
        }
        if (uploadData.files.work_permit_url) {
          workPermitUrl = uploadData.files.work_permit_url;
        }
        if (uploadData.files.profile_image_url) {
          profileImageUrl = uploadData.files.profile_image_url;
        }
      }

      const response = await fetch(`/api/users/${selectedDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile: {
            first_name: editForm.first_name,
            last_name: editForm.last_name,
            address: editForm.address,
            profile_image_url: profileImageUrl
          },
          driver_profile: {
            license_number: editForm.license_number,
            employment_status: editForm.employment_status,
            id_proof_url: idProofUrl,
            work_permit_url: workPermitUrl
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update driver');
      }

      setShowEditModal(false);
      fetchDrivers(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to update driver');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = `${driver.profile.first_name} ${driver.profile.last_name} ${driver.email} ${driver.driver_profile.license_number}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.driver_profile.employment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
                <p className="text-sm text-gray-600">View and manage all registered drivers</p>
              </div>
            </div>
            <Button onClick={() => navigate('/admin/drivers')}>
              <Car className="h-4 w-4 mr-2" />
              Register New Driver
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Drivers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, email, or license..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Drivers List */}
          <Card>
            <CardHeader>
              <CardTitle>Registered Drivers ({filteredDrivers.length})</CardTitle>
              <CardDescription>
                All drivers registered in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading drivers...</p>
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No drivers found</p>
                  <Button onClick={() => navigate('/admin/drivers')} className="mt-4">
                    Register First Driver
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Driver</th>
                        <th className="text-left py-3 px-4">Contact</th>
                        <th className="text-left py-3 px-4">License</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Documents</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrivers.map((driver) => (
                        <tr key={driver.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {driver.profile.profile_image_url ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 mr-3">
                                  <img 
                                    src={driver.profile.profile_image_url} 
                                    alt={`${driver.profile.first_name} ${driver.profile.last_name}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '';
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{driver.profile.first_name} {driver.profile.last_name}</p>
                                <p className="text-sm text-gray-500">{driver.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-1 text-gray-400" />
                              {driver.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <p className="font-medium">{driver.driver_profile.license_number}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(driver.driver_profile.employment_status)}>
                              {driver.driver_profile.employment_status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              {driver.driver_profile.id_proof_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(driver.driver_profile.id_proof_url, '_blank')}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  ID
                                </Button>
                              )}
                              {driver.driver_profile.work_permit_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(driver.driver_profile.work_permit_url, '_blank')}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Permit
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(driver)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
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
      {showEditModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Edit Driver Information</CardTitle>
              <CardDescription>
                Update details for {selectedDriver.profile.first_name} {selectedDriver.profile.last_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="license_number">License Number</Label>
                    <Input
                      id="license_number"
                      value={editForm.license_number}
                      onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employment_status">Employment Status</Label>
                    <Select value={editForm.employment_status} onValueChange={(value: any) => setEditForm({ ...editForm, employment_status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                {/* Profile Image */}
                <div className="space-y-2">
                  <Label htmlFor="profile_image_url">Profile Image</Label>
                  <div className="flex items-center space-x-4">
                    {editForm.profile_image_url && (
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                        <img 
                          src={editForm.profile_image_url} 
                          alt="Profile" 
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
                          value={editForm.profile_image_url}
                          onChange={(e) => setEditForm({ ...editForm, profile_image_url: e.target.value })}
                          placeholder="/uploads/images/profile.jpg"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => editForm.profile_image_url && window.open(editForm.profile_image_url, '_blank')}
                          disabled={!editForm.profile_image_url}
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
                        <span className="text-sm text-gray-500">or upload new image</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                <Label>Documents</Label>
                
                {/* ID Proof */}
                <div className="space-y-2">
                  <Label htmlFor="id_proof_url">ID Proof URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="id_proof_url"
                      value={editForm.id_proof_url}
                      onChange={(e) => setEditForm({ ...editForm, id_proof_url: e.target.value })}
                      placeholder="/uploads/documents/id-proof.jpg"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editForm.id_proof_url && window.open(editForm.id_proof_url, '_blank')}
                      disabled={!editForm.id_proof_url}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setUploadFiles({ ...uploadFiles, id_proof_file: e.target.files?.[0] || null })}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">or upload new file</span>
                  </div>
                </div>

                {/* Work Permit */}
                <div className="space-y-2">
                  <Label htmlFor="work_permit_url">Work Permit URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="work_permit_url"
                      value={editForm.work_permit_url}
                      onChange={(e) => setEditForm({ ...editForm, work_permit_url: e.target.value })}
                      placeholder="/uploads/documents/work-permit.pdf"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editForm.work_permit_url && window.open(editForm.work_permit_url, '_blank')}
                      disabled={!editForm.work_permit_url}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setUploadFiles({ ...uploadFiles, work_permit_file: e.target.files?.[0] || null })}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">or upload new file</span>
                  </div>
                </div>
              </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Driver'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
