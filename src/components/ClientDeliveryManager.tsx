import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Package, Calendar, Eye, RefreshCw, Clock, CheckCircle, AlertCircle, Download, FileText, MessageSquare, Upload, Send } from "lucide-react";

interface Delivery {
  id: string;
  document_title: string;
  document_type: string;
  file_url: string;
  status: string;
  delivered_at: string | null;
  approved_at: string | null;
  created_at: string;
  file_size: number | null;
}

interface RevisionRequest {
  id: string;
  delivery_id: string;
  reasons: string[];
  description: string;
  status: string;
  due_date: string | null;
  created_at: string;
  attachment_urls: string[];
  custom_reason: string | null;
}

interface ClientDeliveryManagerProps {
  clientId: string;
  clientName: string;
}

export function ClientDeliveryManager({ clientId, clientName }: ClientDeliveryManagerProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingToRevision, setRespondingToRevision] = useState<string | null>(null);
  const [revisionResponse, setRevisionResponse] = useState({
    message: "",
    status: "in_progress" as string,
    estimatedCompletion: ""
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchDeliveryData();
  }, [clientId]);

  const fetchDeliveryData = async () => {
    setLoading(true);
    try {
      // Fetch deliveries for this client
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (deliveriesError) throw deliveriesError;

      // Fetch revision requests for this client
      const { data: revisionsData, error: revisionsError } = await supabase
        .from('revision_requests')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (revisionsError) throw revisionsError;

      setDeliveries(deliveriesData || []);
      setRevisionRequests(revisionsData || []);
    } catch (error) {
      console.error('Error fetching delivery data:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRevisionStatus = async (revisionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('revision_requests')
        .update({ status: newStatus })
        .eq('id', revisionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Revision request ${newStatus}`,
      });

      // Refresh data
      fetchDeliveryData();
    } catch (error) {
      console.error('Error updating revision status:', error);
      toast({
        title: "Error",
        description: "Failed to update revision status",
        variant: "destructive"
      });
    }
  };

  const handleRevisionResponse = async (revisionId: string) => {
    try {
      // Update revision status
      const { error: updateError } = await supabase
        .from('revision_requests')
        .update({ 
          status: revisionResponse.status,
        })
        .eq('id', revisionId);

      if (updateError) throw updateError;

      // Add a message/comment about the response
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          client_id: clientId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          sender_type: 'admin',
          message: `Revision response: ${revisionResponse.message}${revisionResponse.estimatedCompletion ? ` Estimated completion: ${revisionResponse.estimatedCompletion}` : ''}`,
          message_type: 'text'
        });

      if (messageError) throw messageError;

      toast({
        title: "Success",
        description: "Revision response sent successfully",
      });

      // Reset form and close dialog
      setRevisionResponse({ message: "", status: "in_progress", estimatedCompletion: "" });
      setRespondingToRevision(null);
      
      // Refresh data
      fetchDeliveryData();
    } catch (error) {
      console.error('Error responding to revision:', error);
      toast({
        title: "Error",
        description: "Failed to send revision response",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (revisionId: string, file: File) => {
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('client-deliveries')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-deliveries')
        .getPublicUrl(filePath);

      // Create a new delivery record
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          client_id: clientId,
          document_title: file.name,
          document_type: 'revision_response',
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          status: 'delivered',
          delivered_at: new Date().toISOString()
        });

      if (deliveryError) throw deliveryError;

      // Update revision status to completed
      await updateRevisionStatus(revisionId, 'completed');

      toast({
        title: "Success",
        description: "Revised file uploaded successfully",
      });

      // Refresh data
      fetchDeliveryData();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload revised file",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'approved':
      case 'completed':
        return 'default';
      case 'pending':
      case 'in_progress':
        return 'secondary';
      case 'revision_requested':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading delivery information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Delivery Overview for {clientName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{deliveries.length}</div>
              <div className="text-sm text-muted-foreground">Total Deliveries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {deliveries.filter(d => d.status === 'approved').length}
              </div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {revisionRequests.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Revisions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Deliveries</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeliveryData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {deliveries.length > 0 ? (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{delivery.document_title}</h4>
                          <Badge variant={getStatusColor(delivery.status)}>
                            {delivery.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Type: {delivery.document_type}</p>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Created: {new Date(delivery.created_at).toLocaleDateString()}
                            </span>
                            {delivery.delivered_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Delivered: {new Date(delivery.delivered_at).toLocaleDateString()}
                              </span>
                            )}
                            {delivery.approved_at && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                Approved: {new Date(delivery.approved_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {delivery.file_size && (
                            <p>Size: {formatFileSize(delivery.file_size)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {delivery.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(delivery.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      )}
                      {delivery.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = delivery.file_url;
                            link.download = delivery.document_title;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">No deliveries yet</p>
          </div>
        )}
      </div>

      {/* Revision Requests Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Revision Requests</h3>
        
        {revisionRequests.length > 0 ? (
          <div className="space-y-4">
            {revisionRequests.map((revision) => {
              const relatedDelivery = deliveries.find(d => d.id === revision.delivery_id);
              return (
                <Card key={revision.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-500" />
                          <h4 className="font-medium">
                            Revision for: {relatedDelivery?.document_title || 'Unknown Document'}
                          </h4>
                          <Badge variant={getStatusColor(revision.status)}>
                            {revision.status}
                          </Badge>
                        </div>
                        {revision.status === 'pending' && (
                          <div className="flex gap-2">
                            <Dialog 
                              open={respondingToRevision === revision.id} 
                              onOpenChange={(open) => !open && setRespondingToRevision(null)}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRespondingToRevision(revision.id)}
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Respond
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Respond to Revision Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                      value={revisionResponse.status}
                                      onValueChange={(value) => setRevisionResponse(prev => ({ ...prev, status: value }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="message">Response Message</Label>
                                    <Textarea
                                      id="message"
                                      placeholder="Enter your response to the client..."
                                      value={revisionResponse.message}
                                      onChange={(e) => setRevisionResponse(prev => ({ ...prev, message: e.target.value }))}
                                      rows={4}
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="completion">Estimated Completion (optional)</Label>
                                    <Input
                                      id="completion"
                                      type="date"
                                      value={revisionResponse.estimatedCompletion}
                                      onChange={(e) => setRevisionResponse(prev => ({ ...prev, estimatedCompletion: e.target.value }))}
                                    />
                                  </div>

                                  <div className="space-y-3">
                                    <Label>Upload Revised File (optional)</Label>
                                    <Input
                                      type="file"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(revision.id, file);
                                        }
                                      }}
                                      disabled={uploadingFile}
                                    />
                                    {uploadingFile && (
                                      <p className="text-sm text-muted-foreground">Uploading file...</p>
                                    )}
                                  </div>

                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => setRespondingToRevision(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleRevisionResponse(revision.id)}
                                      disabled={!revisionResponse.message.trim()}
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Send Response
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Select
                              value={revision.status}
                              onValueChange={(value) => updateRevisionStatus(revision.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Reasons: </span>
                          <span className="text-sm">{revision.reasons.join(', ')}</span>
                          {revision.custom_reason && (
                            <span className="text-sm"> - {revision.custom_reason}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium">Description: </span>
                          <span className="text-sm">{revision.description}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Requested: {new Date(revision.created_at).toLocaleDateString()}
                          </span>
                          {revision.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due: {new Date(revision.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {revision.attachment_urls.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">Attachments: </span>
                            <div className="flex gap-2 mt-1">
                              {revision.attachment_urls.map((url, index) => (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(url, '_blank')}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Attachment {index + 1}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">No revision requests</p>
          </div>
        )}
      </div>
    </div>
  );
}