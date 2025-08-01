import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Download, FileText, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format, differenceInDays, isAfter } from "date-fns";
import { RevisionRequestModal } from "./RevisionRequestModal";
import { DeliveryComments } from "./DeliveryComments";
import { TestimonialPrompt } from "./TestimonialPrompt";

interface Delivery {
  id: string;
  document_type: string;
  document_title: string;
  file_url: string;
  file_size: number;
  status: string;
  delivered_at: string;
  approved_at?: string;
  client_id: string;
}

interface Client {
  id: string;
  name: string;
  estimated_delivery_date?: string;
  is_rush: boolean;
  rush_deadline?: string;
}

export function ClientDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClientAndDeliveries();
    }
  }, [user]);

  const fetchClientAndDeliveries = async () => {
    try {
      // First get the client record
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Then get deliveries for this client
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientData.id)
        .order('delivered_at', { ascending: false });

      if (deliveriesError) throw deliveriesError;
      setDeliveries(deliveriesData || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load your deliveries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDelivery = async (delivery: Delivery) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', delivery.id);

      if (error) throw error;

      toast({
        title: "Document Approved",
        description: "Thank you for approving this delivery!",
      });

      // Check if all deliveries are approved to show testimonial prompt
      const updatedDeliveries = deliveries.map(d => 
        d.id === delivery.id ? { ...d, status: 'approved' as const, approved_at: new Date().toISOString() } : d
      );
      
      const allApproved = updatedDeliveries.every(d => d.status === 'approved');
      if (allApproved) {
        setShowTestimonialPrompt(true);
      }

      setDeliveries(updatedDeliveries);
    } catch (error) {
      console.error('Error approving delivery:', error);
      toast({
        title: "Error",
        description: "Failed to approve delivery.",
        variant: "destructive",
      });
    }
  };

  const handleRequestRevision = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowRevisionModal(true);
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-blue-500';
      case 'revision_requested':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Clock className="h-4 w-4" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDeliveryProgress = () => {
    if (!client?.estimated_delivery_date) return { progress: 0, message: "" };
    
    const deliveryDate = new Date(client.estimated_delivery_date);
    const now = new Date();
    const totalDays = client.is_rush ? 3 : 7; // Rush = 3 days, normal = 7 days
    const startDate = new Date(deliveryDate);
    startDate.setDate(startDate.getDate() - totalDays);
    
    const elapsed = differenceInDays(now, startDate);
    const progress = Math.min(Math.max((elapsed / totalDays) * 100, 0), 100);
    
    if (isAfter(now, deliveryDate)) {
      return { progress: 100, message: "Delivery window has passed" };
    }
    
    const remaining = differenceInDays(deliveryDate, now);
    return { 
      progress, 
      message: remaining > 0 ? `${remaining} days remaining` : "Delivery expected today" 
    };
  };

  const deliveryProgress = getDeliveryProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Status Overview */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.estimated_delivery_date && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Expected Delivery</span>
                  <span className="font-medium">
                    {format(new Date(client.estimated_delivery_date), 'MMM dd, yyyy')}
                    {client.is_rush && (
                      <Badge variant="destructive" className="ml-2">RUSH</Badge>
                    )}
                  </span>
                </div>
                <Progress value={deliveryProgress.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {deliveryProgress.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deliveries List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Deliveries</h2>
        
        {deliveries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No deliveries yet</h3>
              <p className="text-muted-foreground">
                Your completed documents will appear here when they're ready.
              </p>
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
                    {getStatusIcon(delivery.status)}
                    <span className="ml-1 capitalize">
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Delivered {format(new Date(delivery.delivered_at), 'MMM dd, yyyy')}</span>
                  <span>{formatFileSize(delivery.file_size)}</span>
                </div>

                {/* Preview/Download Section */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{delivery.document_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {delivery.document_type.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(delivery.file_url, delivery.document_title)}
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                {delivery.status === 'delivered' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproveDelivery(delivery)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Finalize
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRequestRevision(delivery)}
                      className="flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Revisions
                    </Button>
                  </div>
                )}

                {delivery.status === 'revision_requested' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      Revisions requested. We'll notify you once the updated version is ready 
                      (usually within 3-5 business days).
                    </p>
                  </div>
                )}

                {delivery.status === 'approved' && delivery.approved_at && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✓ Approved on {format(new Date(delivery.approved_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Comments Section */}
                <DeliveryComments deliveryId={delivery.id} clientId={delivery.client_id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Revision Request Modal */}
      {selectedDelivery && (
        <RevisionRequestModal
          delivery={selectedDelivery}
          open={showRevisionModal}
          onOpenChange={setShowRevisionModal}
          onSuccess={() => {
            fetchClientAndDeliveries();
            setShowRevisionModal(false);
            setSelectedDelivery(null);
          }}
        />
      )}

      {/* Testimonial Prompt */}
      <TestimonialPrompt
        open={showTestimonialPrompt}
        onOpenChange={setShowTestimonialPrompt}
        clientName={client?.name || ''}
      />
    </div>
  );
}