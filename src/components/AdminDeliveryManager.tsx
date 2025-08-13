import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Package,
  MessageSquare,
  Plus,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface Client {
  id: string;
  name: string;
  email: string;
  service_type_id?: string;
  service_types?: { name: string };
}

interface ServiceDeliverable {
  id: string;
  deliverable_name: string;
  deliverable_category: string;
  description?: string;
  quantity: number;
}

interface Delivery {
  id: string;
  client_id: string;
  document_type: string;
  document_title: string;
  file_url: string;
  file_size: number;
  status: string;
  delivered_at: string;
  approved_at?: string;
}

interface RevisionRequest {
  id: string;
  delivery_id: string;
  client_id: string;
  reasons: string[];
  custom_reason?: string;
  description: string;
  attachment_urls: string[];
  status: string;
  due_date: string;
  created_at: string;
}

export function AdminDeliveryManager() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceDeliverables, setServiceDeliverables] = useState<ServiceDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRevisionRequest, setSelectedRevisionRequest] = useState<RevisionRequest | null>(null);

  // New delivery form
  const [newDelivery, setNewDelivery] = useState({
    client_id: '',
    document_type: '',
    document_title: '',
    file: null as File | null,
    is_revision: false,
    revision_request_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchDeliveries(),
        fetchRevisionRequests(),
        fetchClients(),
        fetchClientOverview()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async () => {
    console.log('Fetching deliveries...');
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('delivered_at', { ascending: false });

    if (error) {
      console.error('Error fetching deliveries:', error);
      throw error;
    }
    console.log('Fetched deliveries:', data);
    setDeliveries(data || []);
  };

  const fetchClientOverview = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_client_overview');
      if (error) throw error;
      console.log('Admin client overview:', data);
      // This data will show the deliverables structure for all clients
    } catch (error) {
      console.error('Error fetching client overview:', error);
    }
  };

  const fetchRevisionRequests = async () => {
    const { data, error } = await supabase
      .from('revision_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setRevisionRequests(data || []);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id, name, email, service_type_id,
        service_types (name)
      `)
      .order('name');

    if (error) throw error;
    setClients(data || []);
  };

  const fetchServiceDeliverablesForClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client?.service_type_id) return;

    const { data, error } = await supabase
      .from('service_deliverables')
      .select('*')
      .eq('service_type_id', client.service_type_id)
      .order('deliverable_order');

    if (error) {
      console.error('Error fetching service deliverables:', error);
      return;
    }

    setServiceDeliverables(data || []);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `deliveries/${fileName}`;

    const { error } = await supabase.storage
      .from('client-deliveries')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('client-deliveries')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleCreateDelivery = async () => {
    if (!newDelivery.client_id || !newDelivery.document_title || !newDelivery.file) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive",
      });
      return;
    }

    if (newDelivery.is_revision && !newDelivery.revision_request_id) {
      toast({
        title: "Missing revision request",
        description: "Please select which revision request this delivery addresses.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Starting delivery process...');
      
      // Upload file
      console.log('Uploading file:', newDelivery.file.name);
      const fileUrl = await uploadFile(newDelivery.file);
      console.log('File uploaded successfully:', fileUrl);

      let deliveryData;

      if (newDelivery.is_revision && newDelivery.revision_request_id) {
        // For revisions, update the existing delivery
        const revisionRequest = revisionRequests.find(r => r.id === newDelivery.revision_request_id);
        if (!revisionRequest?.delivery_id) {
          throw new Error('No original delivery found for this revision request');
        }

        const updatePayload = {
          document_title: newDelivery.document_title,
          file_path: `deliveries/${Date.now()}.${newDelivery.file.name.split('.').pop()}`,
          file_url: fileUrl,
          file_size: newDelivery.file.size,
          mime_type: newDelivery.file.type,
          status: 'delivered',
          delivered_at: new Date().toISOString()
        };

        console.log('Updating existing delivery with payload:', updatePayload);

        const { data, error } = await supabase
          .from('deliveries')
          .update(updatePayload)
          .eq('id', revisionRequest.delivery_id)
          .select()
          .single();

        if (error) {
          console.error('Database error updating delivery:', error);
          throw error;
        }

        deliveryData = data;

        // Update the revision request status
        const { error: revisionError } = await supabase
          .from('revision_requests')
          .update({ status: 'completed' })
          .eq('id', newDelivery.revision_request_id);

        if (revisionError) {
          console.error('Error updating revision request:', revisionError);
        }
      } else {
        // For new deliveries, create a new record
        const deliveryPayload = {
          client_id: newDelivery.client_id,
          document_type: newDelivery.document_type || 'document',
          document_title: newDelivery.document_title,
          file_path: `deliveries/${Date.now()}.${newDelivery.file.name.split('.').pop()}`,
          file_url: fileUrl,
          file_size: newDelivery.file.size,
          mime_type: newDelivery.file.type,
          status: 'delivered',
          delivered_at: new Date().toISOString()
        };

        console.log('Creating new delivery with payload:', deliveryPayload);

        const { data, error } = await supabase
          .from('deliveries')
          .insert(deliveryPayload)
          .select()
          .single();

        if (error) {
          console.error('Database error creating delivery:', error);
          throw error;
        }

        deliveryData = data;
      }

      console.log('Delivery created successfully:', deliveryData);

      // Send notification
      try {
        console.log('Sending notification...');
        const notificationPayload = {
          delivery_id: deliveryData.id,
          client_id: newDelivery.client_id,
          document_title: newDelivery.document_title,
          notification_type: 'delivery_ready'
        };

        console.log('Notification payload:', notificationPayload);

        const { error: notificationError } = await supabase.functions.invoke('send-delivery-notification', {
          body: notificationPayload
        });

        if (notificationError) {
          console.error('Notification error (delivery still created):', notificationError);
          toast({
            title: "Delivery Created",
            description: "Document delivered successfully. Note: Notification may have failed to send.",
          });
        } else {
          console.log('Notification sent successfully');
          toast({
            title: "Delivery Created & Notification Sent",
            description: "The document has been delivered and the client has been notified.",
          });
        }
      } catch (notificationError) {
        console.error('Notification failed (delivery still created):', notificationError);
        toast({
          title: "Delivery Created",
          description: "Document delivered successfully. Notification could not be sent.",
        });
      }

      setShowCreateModal(false);
      setNewDelivery({
        client_id: '',
        document_type: '',
        document_title: '',
        file: null,
        is_revision: false,
        revision_request_id: ''
      });
      
      console.log('Refreshing deliveries list...');
      await fetchDeliveries();
      console.log('Delivery process completed');
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast({
        title: "Error",
        description: "Failed to create delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRevisionStatus = async (revisionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('revision_requests')
        .update({ status })
        .eq('id', revisionId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Revision request marked as ${status}.`,
      });

      fetchRevisionRequests();
    } catch (error) {
      console.error('Error updating revision status:', error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-blue-500';
      case 'revision_requested':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-orange-500';
      case 'in_progress':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading delivery data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Delivery Management</h2>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Delivery</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={newDelivery.client_id} onValueChange={(value) => {
                  setNewDelivery(prev => ({ ...prev, client_id: value, document_type: '', revision_request_id: '' }));
                  fetchServiceDeliverablesForClient(value);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Only show deliverable type for new deliveries */}
              {!newDelivery.is_revision && (
                <div className="space-y-2">
                  <Label htmlFor="document_type">Deliverable Type</Label>
                  <Select 
                    value={newDelivery.document_type} 
                    onValueChange={(value) => setNewDelivery(prev => ({ ...prev, document_type: value }))}
                    disabled={!newDelivery.client_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newDelivery.client_id ? "Select deliverable type" : "Select client first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceDeliverables.map((deliverable) => (
                        <SelectItem key={deliverable.id} value={deliverable.deliverable_name.toLowerCase().replace(/\s+/g, '_')}>
                          {deliverable.deliverable_name}
                          {deliverable.description && (
                            <span className="text-muted-foreground ml-2">- {deliverable.description}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_revision"
                  checked={newDelivery.is_revision}
                  onCheckedChange={(checked) => setNewDelivery(prev => ({ ...prev, is_revision: checked, revision_request_id: '' }))}
                />
                <Label htmlFor="is_revision" className="text-sm">This is a revision delivery</Label>
              </div>

              {newDelivery.is_revision && (
                <div className="space-y-2">
                  <Label htmlFor="revision_request">Revision Request</Label>
                  <Select 
                    value={newDelivery.revision_request_id} 
                    onValueChange={(value) => {
                      const selectedRequest = revisionRequests.find(r => r.id === value);
                      const originalDelivery = deliveries.find(d => d.id === selectedRequest?.delivery_id);
                      
                      if (originalDelivery) {
                        // Count existing revisions for this document
                        const revisionCount = deliveries.filter(d => 
                          d.document_title.includes(originalDelivery.document_title.split(' - Revised')[0])
                        ).length;
                        
                        const baseTitle = originalDelivery.document_title.split(' - Revised')[0];
                        const newTitle = `${baseTitle} - Revised ${revisionCount}`;
                        
                        setNewDelivery(prev => ({ 
                          ...prev, 
                          revision_request_id: value,
                          document_title: newTitle 
                        }));
                      } else {
                        setNewDelivery(prev => ({ ...prev, revision_request_id: value }));
                      }
                    }}
                    disabled={!newDelivery.client_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select revision request" />
                    </SelectTrigger>
                    <SelectContent>
                      {revisionRequests
                        .filter(req => req.client_id === newDelivery.client_id && req.status !== 'completed')
                        .map((request) => (
                          <SelectItem key={request.id} value={request.id}>
                            {deliveries.find(d => d.id === request.delivery_id)?.document_title || 'Unknown Document'} 
                            <span className="text-muted-foreground ml-2">
                              - {format(new Date(request.created_at), 'MMM dd')}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {newDelivery.client_id && revisionRequests.filter(req => req.client_id === newDelivery.client_id && req.status !== 'completed').length === 0 && (
                    <p className="text-sm text-muted-foreground">No pending revision requests for this client</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  value={newDelivery.document_title}
                  onChange={(e) => setNewDelivery(prev => ({ ...prev, document_title: e.target.value }))}
                  placeholder={newDelivery.is_revision ? "e.g., Professional Resume - Revised Version" : "e.g., Professional Resume - Final Version"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setNewDelivery(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                />
              </div>

              <Button onClick={handleCreateDelivery} className="w-full">
                {newDelivery.is_revision ? 'Create Revision Delivery' : 'Create Delivery'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="deliveries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="deliveries">
            <Package className="h-4 w-4 mr-2" />
            All Deliveries
          </TabsTrigger>
          <TabsTrigger value="revisions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Revision Requests
            {revisionRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {revisionRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-4">
          {deliveries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No deliveries yet</h3>
                <p className="text-muted-foreground">Create your first delivery using the button above.</p>
              </CardContent>
            </Card>
          ) : (
            deliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {delivery.document_title}
                    </CardTitle>
                    <Badge className={getStatusColor(delivery.status)}>
                      {delivery.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {clients.find(c => c.id === delivery.client_id)?.name || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {delivery.document_type.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Delivered:</span> {format(new Date(delivery.delivered_at), 'MMM dd, yyyy')}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {(delivery.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(delivery.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Revision Requests Tab */}
        <TabsContent value="revisions" className="space-y-4">
          {revisionRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No revision requests</h3>
                <p className="text-muted-foreground">Revision requests will appear here when clients request changes.</p>
              </CardContent>
            </Card>
          ) : (
            revisionRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {deliveries.find(d => d.id === request.delivery_id)?.document_title || 'Unknown Document'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {request.status === 'pending' && (
                        <Badge variant="destructive">
                          <Clock className="h-3 w-3 mr-1" />
                          Due {format(new Date(request.due_date), 'MMM dd')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {clients.find(c => c.id === request.client_id)?.name || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Requested:</span> {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-medium">Reasons:</span>
                    <div className="flex flex-wrap gap-1">
                      {request.reasons.map((reason, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                    {request.custom_reason && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Custom reason:</strong> {request.custom_reason}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="font-medium">Description:</span>
                    <p className="text-sm bg-muted p-3 rounded">{request.description}</p>
                  </div>

                  {request.attachment_urls.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-medium">Attachments:</span>
                      <div className="flex gap-2">
                        {request.attachment_urls.map((url, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            File {index + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleUpdateRevisionStatus(request.id, 'in_progress')}
                        size="sm"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Start Working
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateRevisionStatus(request.id, 'completed')}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    </div>
                  )}

                  {request.status === 'in_progress' && (
                    <Button
                      onClick={() => handleUpdateRevisionStatus(request.id, 'completed')}
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}