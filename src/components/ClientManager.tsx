import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Calendar, CheckCircle, Search, ArrowUpDown, ExternalLink, Trash2, Users, Archive, Mail, RefreshCw } from "lucide-react";
import { DocumentUploadParser } from "./DocumentUploadParser";
import { DocumentUploadModal } from "./DocumentUploadModal";

interface ServiceType {
  id: string;
  name: string;
  description: string;
  default_timeline_days: number;
  tags: string[];
  price_cents: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  service_type_id: string;
  status: string;
  payment_status: string;
  phone: string | null;
  estimated_delivery_date: string | null;
  created_at: string;
  is_rush: boolean;
  rush_deadline: string | null;
  service_types: ServiceType;
}

export function ClientManager() {
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created_at' | 'estimated_delivery_date' | 'service_type' | 'status' | 'payment_status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    service_type_id: "",
    phone: "",
    preventAutoLink: false // New option to prevent auto-linking to existing users
  });

  useEffect(() => {
    fetchServiceTypes();
    fetchClients();
  }, []);

  const fetchServiceTypes = async () => {
    const { data, error } = await supabase
      .from("service_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load service types", variant: "destructive" });
    } else {
      setServiceTypes(data || []);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        service_types (*)
      `)
      .order("is_rush", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load clients", variant: "destructive" });
    } else {
      setClients(data || []);
    }
  };

  const triggerOnboardingAutomation = async (clientId: string, serviceTypeId: string) => {
    try {
      // Log the onboarding trigger
      await supabase.from("client_history").insert({
        client_id: clientId,
        action_type: "onboarding_triggered",
        description: "Automatic onboarding initiated based on service type",
        metadata: { service_type_id: serviceTypeId }
      });

      toast({ title: "Success", description: "Onboarding automation triggered successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to trigger onboarding automation", variant: "destructive" });
    }
  };

  const addClient = async () => {
    console.log('addClient called with data:', newClient);
    
    if (!newClient.name || !newClient.email || !newClient.service_type_id) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    console.log('Checking if client email already exists...');
    
    // Check if email already exists as a user account
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", newClient.email.toLowerCase())
      .single();
      
    if (existingProfile) {
      toast({ 
        title: "Warning", 
        description: `Email ${newClient.email} already exists as a user account. The new client will be linked to existing user data.`,
        variant: "destructive"
      });
    }

    const serviceType = serviceTypes.find(st => st.id === newClient.service_type_id);
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + (serviceType?.default_timeline_days || 7));

    console.log('Creating client with data:', {
      ...newClient,
      estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
      payment_status: "pending"
    });

    const { data, error } = await supabase
      .from("clients")
      .insert([{
        name: newClient.name,
        email: newClient.email,
        service_type_id: newClient.service_type_id,
        phone: newClient.phone,
        user_id: null, // Clients can exist without being linked to a user initially
        estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
        payment_status: "pending"
      }])
      .select()
      .single();
      
    console.log('Client creation result:', { data, error });

    if (error) {
      toast({ title: "Error", description: "Failed to add client", variant: "destructive" });
    } else {
      // Trigger onboarding automation
      await triggerOnboardingAutomation(data.id, newClient.service_type_id);
      
      toast({ title: "Success", description: "Client added and onboarding triggered" });
      setNewClient({ name: "", email: "", service_type_id: "", phone: "", preventAutoLink: false });
      setIsAddingClient(false);
      fetchClients();
    }
  };

  const updateClientService = async (clientId: string, newServiceTypeId: string) => {
    const serviceType = serviceTypes.find(st => st.id === newServiceTypeId);
    const newDeliveryDate = new Date();
    newDeliveryDate.setDate(newDeliveryDate.getDate() + (serviceType?.default_timeline_days || 7));

    const { error } = await supabase
      .from("clients")
      .update({
        service_type_id: newServiceTypeId,
        estimated_delivery_date: newDeliveryDate.toISOString().split('T')[0]
      })
      .eq("id", clientId);

    if (error) {
      toast({ title: "Error", description: "Failed to update client service", variant: "destructive" });
    } else {
      // Trigger new onboarding
      await triggerOnboardingAutomation(clientId, newServiceTypeId);
      
      // Log the service change
      await supabase.from("client_history").insert({
        client_id: clientId,
        action_type: "service_changed",
        description: `Service type changed to ${serviceType?.name}`,
        metadata: { old_service_type_id: clientId, new_service_type_id: newServiceTypeId }
      });

      toast({ title: "Success", description: "Client service updated and re-onboarded" });
      fetchClients();
    }
  };

  const toggleRushStatus = async (clientId: string, currentRushStatus: boolean) => {
    const { error } = await supabase
      .from("clients")
      .update({ is_rush: !currentRushStatus })
      .eq("id", clientId);

    if (error) {
      toast({ title: "Error", description: "Failed to update rush status", variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: !currentRushStatus ? "Client marked as RUSH (72-hour delivery)" : "RUSH status removed" 
      });
      fetchClients();
    }
  };

  // Bulk selection functions
  const handleSelectAll = () => {
    if (selectedClients.size === filteredAndSortedClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredAndSortedClients.map(client => client.id)));
    }
  };

  const handleSelectClient = (clientId: string) => {
    console.log('Selecting client:', clientId);
    console.log('Current selected clients:', Array.from(selectedClients));
    
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
      console.log('Deselected client:', clientId);
    } else {
      newSelected.add(clientId);
      console.log('Selected client:', clientId);
    }
    setSelectedClients(newSelected);
    console.log('New selected clients:', Array.from(newSelected));
  };

  // Comprehensive client deletion function
  const deleteClientCompletely = async (clientId: string) => {
    console.log('deleteClientCompletely called with clientId:', clientId);
    
    try {
      console.log('Calling supabase.rpc delete_customer_completely...');
      // Call the database function to delete all client data
      const { data, error } = await supabase.rpc('delete_customer_completely', {
        client_id_param: clientId
      });
      
      console.log('RPC response:', { data, error });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; user_id_to_delete?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete client');
      }

      // If there's an associated auth user, delete it too
      if (result.user_id_to_delete) {
        try {
          const { error: authError } = await supabase.functions.invoke('delete-auth-user', {
            body: { user_id: result.user_id_to_delete }
          });

          if (authError) {
            console.error('Failed to delete auth user:', authError);
            // Don't throw here - the main client data is already deleted
          }
        } catch (authError) {
          console.error('Failed to delete auth user:', authError);
          // Don't throw here - the main client data is already deleted
        }
      }

      return result;
    } catch (error) {
      console.error('Error in deleteClientCompletely:', error);
      throw error;
    }
  };

  // Individual client deletion
  const deleteClient = async (clientId: string, clientName: string) => {
    console.log('deleteClient called with:', { clientId, clientName });
    
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${clientName}? This will remove ALL their data including login credentials, history, messages, and files. This action cannot be undone.`)) {
      console.log('User cancelled deletion');
      return;
    }
    
    console.log('User confirmed deletion, proceeding...');

    try {
      const result = await deleteClientCompletely(clientId);
      
      toast({
        title: "Success",
        description: `${clientName} and all associated data has been permanently deleted`
      });

      fetchClients();
    } catch (error) {
      console.error('Delete client error:', error);
      toast({
        title: "Error",
        description: "Failed to delete client completely",
        variant: "destructive"
      });
    }
  };

  // Bulk action functions
  const bulkDeleteClients = async () => {
    console.log('Bulk delete called with selected clients:', Array.from(selectedClients));
    
    if (selectedClients.size === 0) {
      console.log('No clients selected for deletion');
      return;
    }
    
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedClients.size} client(s)? This will remove ALL their data including login credentials, history, messages, and files. This action cannot be undone.`)) {
      console.log('User cancelled deletion');
      return;
    }

    setBulkActionLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Delete each client completely
      for (const clientId of selectedClients) {
        try {
          await deleteClientCompletely(clientId);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete client ${clientId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} client(s) permanently deleted${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Error", 
          description: "Failed to delete any clients",
          variant: "destructive"
        });
      }

      setSelectedClients(new Set());
      fetchClients();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete clients",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedClients.size === 0) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ status: newStatus })
        .in("id", Array.from(selectedClients));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedClients.size} client(s) status updated to ${newStatus}`
      });

      setSelectedClients(new Set());
      fetchClients();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkUpdatePaymentStatus = async (newPaymentStatus: string) => {
    if (selectedClients.size === 0) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ payment_status: newPaymentStatus })
        .in("id", Array.from(selectedClients));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedClients.size} client(s) payment status updated to ${newPaymentStatus}`
      });

      setSelectedClients(new Set());
      fetchClients();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkAssignService = async (serviceTypeId: string) => {
    if (selectedClients.size === 0) return;

    const serviceType = serviceTypes.find(st => st.id === serviceTypeId);
    if (!serviceType) return;

    setBulkActionLoading(true);
    try {
      const newDeliveryDate = new Date();
      newDeliveryDate.setDate(newDeliveryDate.getDate() + serviceType.default_timeline_days);

      const { error } = await supabase
        .from("clients")
        .update({
          service_type_id: serviceTypeId,
          estimated_delivery_date: newDeliveryDate.toISOString().split('T')[0]
        })
        .in("id", Array.from(selectedClients));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedClients.size} client(s) assigned to ${serviceType.name}`
      });

      setSelectedClients(new Set());
      fetchClients();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign service type",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const searchLower = searchQuery.toLowerCase();
      return (
        client.name.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.status.toLowerCase().includes(searchLower) ||
        client.payment_status.toLowerCase().includes(searchLower) ||
        client.service_types.name.toLowerCase().includes(searchLower) ||
        (client.phone && client.phone.toLowerCase().includes(searchLower))
      );
    });

    return filtered.sort((a, b) => {
      // Always prioritize RUSH clients first
      if (a.is_rush && !b.is_rush) return -1;
      if (!a.is_rush && b.is_rush) return 1;
      
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'estimated_delivery_date':
          aValue = a.estimated_delivery_date ? new Date(a.estimated_delivery_date) : new Date(0);
          bValue = b.estimated_delivery_date ? new Date(b.estimated_delivery_date) : new Date(0);
          break;
        case 'service_type':
          aValue = a.service_types.name.toLowerCase();
          bValue = b.service_types.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'payment_status':
          aValue = a.payment_status.toLowerCase();
          bValue = b.payment_status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, searchQuery, sortBy, sortOrder]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-rdr-navy font-heading">Client Management</h2>
        {!isAddingClient && (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAddingClient(true)}
              className="flex items-center gap-2 text-rdr-navy border-rdr-navy hover:bg-rdr-navy hover:text-white"
            >
              <Plus className="w-4 h-4" />
              Add Client Manually
            </Button>
            <DocumentUploadModal 
              serviceTypes={serviceTypes} 
              onClientCreated={() => {
                fetchClients();
                setIsAddingClient(false);
              }} 
            />
          </div>
        )}
      </div>

      {/* Search and Sort Controls */}
      <Card className="shadow-lg border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-rdr-medium-gray" />
              <Input
                placeholder="Search by name, email, status, service type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Label className="text-sm font-medium whitespace-nowrap text-rdr-navy">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="estimated_delivery_date">Delivery Date</SelectItem>
                  <SelectItem value="service_type">Service Type</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="payment_status">Payment Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </Button>
            </div>
          </div>
          <div className="mt-2 text-sm text-rdr-medium-gray">
            Showing {filteredAndSortedClients.length} of {clients.length} clients
          </div>
        </CardContent>
      </Card>

      {isAddingClient && (
        <Card className="shadow-lg border border-border">
          <CardHeader>
            <CardTitle className="text-rdr-navy font-heading">Add New Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-rdr-navy">Full Name *</Label>
              <Input
                id="name"
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-rdr-navy">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({...newClient, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-rdr-navy">Phone</Label>
              <Input
                id="phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="service_type" className="text-rdr-navy">Service Type *</Label>
              <Select onValueChange={(value) => setNewClient({...newClient, service_type_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((serviceType) => (
                    <SelectItem key={serviceType.id} value={serviceType.id}>
                      {serviceType.name} ({serviceType.default_timeline_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addClient} className="bg-rdr-navy hover:bg-rdr-navy/90">
                Add Client
              </Button>
              <Button variant="outline" onClick={() => setIsAddingClient(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedClients.size > 0 && (
        <Card className="shadow-lg border border-rdr-gold bg-rdr-gold/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-rdr-navy" />
                  <span className="font-medium text-rdr-navy">
                    {selectedClients.size} client(s) selected
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClients(new Set())}
                  className="text-rdr-navy border-rdr-navy"
                >
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status Updates */}
                <Select onValueChange={bulkUpdateStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Set Active</SelectItem>
                    <SelectItem value="inactive">Set Inactive</SelectItem>
                    <SelectItem value="completed">Set Completed</SelectItem>
                    <SelectItem value="on_hold">Set On Hold</SelectItem>
                  </SelectContent>
                </Select>

                {/* Payment Status Updates */}
                <Select onValueChange={bulkUpdatePaymentStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Set Pending</SelectItem>
                    <SelectItem value="paid">Set Paid</SelectItem>
                    <SelectItem value="overdue">Set Overdue</SelectItem>
                    <SelectItem value="refunded">Set Refunded</SelectItem>
                  </SelectContent>
                </Select>

                {/* Service Assignment */}
                <Select onValueChange={bulkAssignService}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Assign Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((serviceType) => (
                      <SelectItem key={serviceType.id} value={serviceType.id}>
                        {serviceType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDeleteClients}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-2"
                >
                  {bulkActionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select All Header */}
      {filteredAndSortedClients.length > 0 && (
        <Card className="shadow-lg border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedClients.size === filteredAndSortedClients.length && filteredAndSortedClients.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-rdr-navy">
                Select All ({filteredAndSortedClients.length} clients)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredAndSortedClients.map((client) => {
          const daysUntilDelivery = client.estimated_delivery_date ? 
            Math.ceil((new Date(client.estimated_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
          const isUrgent = daysUntilDelivery !== null && daysUntilDelivery <= 3;
          const isOverdue = daysUntilDelivery !== null && daysUntilDelivery < 0;
          const isRushUrgent = client.is_rush && client.rush_deadline && 
            new Date(client.rush_deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;
          
          return (
            <Card 
              key={client.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                client.is_rush ? 'ring-2 ring-red-500 bg-red-50' : 
                isOverdue ? 'ring-2 ring-destructive' : 
                isUrgent ? 'ring-2 ring-orange-400' : ''
              } ${selectedClients.has(client.id) ? 'ring-2 ring-rdr-gold bg-rdr-gold/10' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Selection Checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client.id)}
                      onChange={(e) => {
                        console.log('Checkbox clicked for client:', client.id);
                        e.stopPropagation();
                        handleSelectClient(client.id);
                      }}
                      onClick={(e) => {
                        console.log('Checkbox direct click for client:', client.id);
                        e.stopPropagation();
                      }}
                      className="rounded border-gray-300"
                    />
                  </div>

                  {/* Client Content */}
                  <div 
                    className="flex-1"
                    onClick={() => navigate(`/client/${client.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">
                            {client.name}
                          </h3>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          {client.is_rush && (
                            <Badge variant="destructive" className="text-xs font-bold animate-pulse">
                              🚨 RUSH
                            </Badge>
                          )}
                          {isOverdue && !client.is_rush && (
                            <Badge variant="destructive" className="text-xs">
                              OVERDUE
                            </Badge>
                          )}
                          {isUrgent && !isOverdue && !client.is_rush && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              URGENT
                            </Badge>
                          )}
                          {isRushUrgent && (
                            <Badge variant="destructive" className="text-xs bg-red-600 text-white">
                              RUSH URGENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{client.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteClient(client.id, client.name);
                          }}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={client.is_rush}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleRushStatus(client.id, client.is_rush);
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className={client.is_rush ? "text-red-600 font-semibold" : ""}>
                            RUSH (72h)
                          </span>
                        </label>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                        <Badge variant={client.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {client.payment_status}
                        </Badge>
                      </div>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label className="text-sm font-medium">Service Type</Label>
                        <Select
                          value={client.service_type_id}
                          onValueChange={(value) => updateClientService(client.id, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceTypes.map((serviceType) => (
                              <SelectItem key={serviceType.id} value={serviceType.id}>
                                {serviceType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">
                          {client.is_rush ? "Rush Deadline" : "Estimated Delivery"}
                        </Label>
                        <div className="flex items-center mt-1">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className={`text-sm ${client.is_rush ? 'text-red-600 font-semibold' : ''}`}>
                            {client.is_rush && client.rush_deadline ? 
                              new Date(client.rush_deadline).toLocaleString() :
                              client.estimated_delivery_date ? 
                              new Date(client.estimated_delivery_date).toLocaleDateString() : 
                              'Not set'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {client.service_types.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(client.created_at).toLocaleDateString()} • 
                      Timeline: {client.is_rush ? '72 hours (RUSH)' : `${client.service_types.default_timeline_days} days`} • 
                      Payment: {client.payment_status}
                      {client.is_rush && (
                        <span className="text-red-600 font-semibold"> • 🚨 RUSH ORDER</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}