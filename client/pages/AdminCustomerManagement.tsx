import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Mail, Phone, Search, Edit, Eye, Upload, X, Camera, MapPin, Check } from 'lucide-react';

interface Customer {
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
    is_registered_customer?: boolean;
    registered_number?: string;
  };
}

export default function AdminCustomerManagement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    profile_image_url: '',
    is_registered_customer: false,
    registered_number: ''
  });

  const [uploadFiles, setUploadFiles] = useState({
    profile_image_file: null as File | null
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?role=customer', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      setCustomers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setError('');
    setSuccess('');
    setEditForm({
      first_name: customer.profile.first_name || '',
      last_name: customer.profile.last_name || '',
      phone: customer.phone || '',
      address: customer.profile.address || '',
      profile_image_url: customer.profile.profile_image_url || '',
      is_registered_customer: customer.profile.is_registered_customer || false,
      registered_number: customer.profile.registered_number || ''
    });
    setUploadFiles({
      profile_image_file: null
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Handle file upload first
      let profileImageUrl = editForm.profile_image_url;
      
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

      const response = await fetch(`/api/users/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: editForm.phone,
          profile: {
            first_name: editForm.first_name,
            last_name: editForm.last_name,
            address: editForm.address,
            profile_image_url: profileImageUrl,
            is_registered_customer: editForm.is_registered_customer,
            registered_number: editForm.registered_number
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      setShowEditModal(false);
      setSuccess('Customer updated successfully!');
      fetchCustomers(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (checked: boolean | string) => {
    const isChecked = checked === true;
    setEditForm(prev => ({
      ...prev,
      is_registered_customer: isChecked,
      registered_number: isChecked ? prev.registered_number : ''
    }));
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-sm text-gray-600">View and manage registered customers</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate('/admin/customers')}>
                <User className="h-4 w-4 mr-2" />
                Register Customer
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
                  placeholder="Search by name, email..."
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
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customers List */}
          <Card>
            <CardHeader>
              <CardTitle>Registered Customers ({filteredCustomers.length})</CardTitle>
              <CardDescription>
                All customers registered in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading customers...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No customers found</p>
                  <Button onClick={() => navigate('/admin/customers')} className="mt-4">
                    Register First Customer
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Customer</th>
                        <th className="text-left py-3 px-4">Contact</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {customer.profile.profile_image_url ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 mr-3">
                                  <img 
                                    src={customer.profile.profile_image_url} 
                                    alt={`${customer.profile.first_name} ${customer.profile.last_name}`}
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
                                <p className="font-medium">{customer.profile.first_name} {customer.profile.last_name}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-1 text-gray-400" />
                              {customer.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={customer.status === 'active' ? 'default' : 'secondary'}
                              className={customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {customer.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(customer)}
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
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Customer Details</h2>
                    <p className="text-sm text-gray-500">Edit customer information</p>
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
                {/* Profile Section */}
                <div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
                  <div className="relative">
                    {editForm.profile_image_url ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                        <img 
                          src={editForm.profile_image_url} 
                          alt={`${editForm.first_name} ${editForm.last_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full bg-white shadow-md"
                        onClick={() => document.getElementById('profile_image_upload')?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editForm.first_name} {editForm.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Mail className="h-4 w-4 mr-1" />
                      {selectedCustomer.email}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge 
                        variant={selectedCustomer.status === 'active' ? 'default' : 'secondary'}
                        className={selectedCustomer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {selectedCustomer.status}
                      </Badge>
                      <span className="text-sm text-gray-500">ID: #{selectedCustomer.id}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Image Upload (Hidden) */}
                <Input
                  id="profile_image_upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFiles({ ...uploadFiles, profile_image_file: e.target.files?.[0] || null })}
                  className="hidden"
                />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Personal Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="first_name" className="text-sm font-medium">First Name</Label>
                        <Input
                          id="first_name"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="last_name" className="text-sm font-medium">Last Name</Label>
                        <Input
                          id="last_name"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Contact Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="pl-10"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                        <div className="relative mt-1">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="address"
                            value={editForm.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            className="pl-10"
                            placeholder="123 Main St, City, State 12345"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id="is_registered_customer"
                          checked={editForm.is_registered_customer}
                          onCheckedChange={handleCheckboxChange}
                        />
                        <Label htmlFor="is_registered_customer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Is this a registered customer?
                        </Label>
                      </div>

                      {editForm.is_registered_customer && (
                        <div>
                          <Label htmlFor="registered_number" className="text-sm font-medium">Registered Number *</Label>
                          <Input
                            id="registered_number"
                            type="text"
                            placeholder="Enter registered customer number"
                            value={editForm.registered_number}
                            onChange={(e) => handleInputChange('registered_number', e.target.value)}
                            required={editForm.is_registered_customer}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="profile_image_url" className="text-sm font-medium">Profile Image URL</Label>
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
                          Update Customer
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

      {/* Success Alert */}
      {success && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
