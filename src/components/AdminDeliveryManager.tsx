import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  service_types?: { name: string };
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
  clients: any;
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
  clients: any;
  deliveries: any;
}

export function AdminDeliveryManager() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRevisionRequest, setSelectedRevisionRequest] = useState<RevisionRequest | null>(null);

  // New delivery form
  const [newDelivery, setNewDelivery] = useState({
    client_id: '',
    document_type: '',
    document_title: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchDeliveries(),
        fetchRevisionRequests(),
        fetchClients()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        clients (id, name, email, service_types (name))
      `)
      .order('delivered_at', { ascending: false });

    if (error) throw error;
    setDeliveries(data || []);
  };

  const fetchRevisionRequests = async () => {
    const { data, error } = await supabase
      .from('revision_requests')
      .select(`
        *,
        clients (id, name, email),
        deliveries (document_title, document_type)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setRevisionRequests(data || []);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id, name, email,
        service_types (name)
      `)
      .order('name');

    if (error) throw error;
    setClients(data || []);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `deliveries/${fileName}`;

    const { error } = await supabase.storage
      .from('resumes')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('resumes')
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

    try {
      setLoading(true);
      
      // Upload file
      const fileUrl = await uploadFile(newDelivery.file);

      // Create delivery
      const { error } = await supabase
        .from('deliveries')
        .insert({
          client_id: newDelivery.client_id,
          document_type: newDelivery.document_type || 'document',
          document_title: newDelivery.document_title,
          file_path: fileUrl,
          file_url: fileUrl,
          file_size: newDelivery.file.size,
          mime_type: newDelivery.file.type,
          status: 'delivered'
        });

      if (error) throw error;

      toast({
        title: "Delivery Created",
        description: "The document has been delivered to the client.",
      });

      setShowCreateModal(false);
      setNewDelivery({
        client_id: '',
        document_type: '',
        document_title: '',
        file: null
      });
      
      fetchDeliveries();
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
                <Select value={newDelivery.client_id} onValueChange={(value) => 
                  setNewDelivery(prev => ({ ...prev, client_id: value }))
                }>
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

              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type</Label>
                <Select value={newDelivery.document_type} onValueChange={(value) => 
                  setNewDelivery(prev => ({ ...prev, document_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resume">Resume</SelectItem>
                    <SelectItem value="cover_letter">Cover Letter</SelectItem>
                    <SelectItem value="linkedin">LinkedIn Profile</SelectItem>
                    <SelectItem value="biography">Biography</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  value={newDelivery.document_title}
                  onChange={(e) => setNewDelivery(prev => ({ ...prev, document_title: e.target.value }))}
                  placeholder="e.g., Professional Resume - Final Version"
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
                Create Delivery
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
                      <span className="font-medium">Client:</span> {delivery.clients.name}
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
                      {request.deliveries.document_title}
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
                      <span className="font-medium">Client:</span> {request.clients.name}
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