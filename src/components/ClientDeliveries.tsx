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
  file_path: string;
  file_size: number;
  status: string;
  delivered_at: string;
  approved_at?: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  mime_type: string | null;
  project_id: string | null;
  service_deliverable_id: string | null;
  deliverable_instance: number | null;
}

interface ServiceDeliverable {
  id: string;
  service_type_id: string;
  deliverable_name: string;
  deliverable_category: string;
  description: string;
  quantity: number;
  deliverable_order: number;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  estimated_delivery_date?: string;
  is_rush: boolean;
  rush_deadline?: string;
  service_type_id: string;
}

export function ClientDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [serviceDeliverables, setServiceDeliverables] = useState<ServiceDeliverable[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);

  useEffect(() => {
    if (user?.email) {
      fetchClientAndDeliveries();
    }
  }, [user]);

  const fetchClientAndDeliveries = async () => {
    try {
      setLoading(true);
      
      // First, get the client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          estimated_delivery_date,
          is_rush,
          rush_deadline,
          service_type_id
        `)
        .eq('email', user?.email)
        .single();

      if (clientError) {
        console.error('Error fetching client:', clientError);
        return;
      }

      if (!clientData) {
        console.log('No client found for email:', user?.email);
        return;
      }

      setClient(clientData);

      // Get service deliverables using raw query to avoid type issues
      const { data: deliverablesData } = await supabase
        .from('service_deliverables' as any)
        .select('*')
        .eq('service_type_id', clientData.service_type_id)
        .order('deliverable_order');
      
      setServiceDeliverables((deliverablesData as unknown || []) as ServiceDeliverable[]);

      // Get actual deliveries for this client
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false });

      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError);
      } else {
        setDeliveries((deliveriesData || []) as Delivery[]);
      }

    } catch (error) {
      console.error('Error in fetchClientAndDeliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery data. Please try again.",
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

      {/* Package Deliverables List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Package Deliverables</h2>
        
        {serviceDeliverables.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No service package found for your account.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {serviceDeliverables.map((deliverable) => {
              // Find matching actual deliveries for this deliverable
              const matchingDeliveries = deliveries.filter(d => 
                d.service_deliverable_id === deliverable.id
              );
              
              const isMultiInstance = deliverable.quantity > 1;
              const completedCount = matchingDeliveries.filter(d => d.status === 'delivered').length;
              const totalRequired = deliverable.quantity;
              
              return (
                <Card key={deliverable.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {deliverable.deliverable_name}
                        {isMultiInstance && (
                          <Badge variant="secondary">
                            {completedCount}/{totalRequired}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {completedCount === totalRequired && totalRequired > 0 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        ) : completedCount > 0 ? (
                          <Badge variant="outline" className="border-blue-200 text-blue-800">
                            <Clock className="w-3 h-3 mr-1" />
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 text-gray-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                    
                    {isMultiInstance && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{completedCount}/{totalRequired} completed</span>
                        </div>
                        <Progress value={(completedCount / totalRequired) * 100} className="h-2" />
                      </div>
                    )}
                  </CardHeader>
                  
                  {/* Show actual deliveries if any exist */}
                  {matchingDeliveries.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <Separator />
                        <h4 className="font-medium text-sm">Delivered Items:</h4>
                        {matchingDeliveries.map((delivery) => (
                          <div key={delivery.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="font-medium">{delivery.document_title}</span>
                                <Badge 
                                  className={getStatusColor(delivery.status)}
                                >
                                  {getStatusIcon(delivery.status)}
                                  {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                                </Badge>
                              </div>
                              {delivery.status === 'delivered' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(delivery.file_url, delivery.document_title)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </Button>
                              )}
                            </div>
                            
                            {delivery.delivered_at && (
                              <p className="text-sm text-muted-foreground">
                                Delivered: {format(new Date(delivery.delivered_at), 'MMM dd, yyyy')}
                              </p>
                            )}
                            
                            {delivery.file_size && (
                              <p className="text-sm text-muted-foreground">
                                File size: {formatFileSize(delivery.file_size)}
                              </p>
                            )}
                            
                            {delivery.status === 'delivered' && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleApproveDelivery(delivery)}
                                  disabled={delivery.approved_at !== null}
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  {delivery.approved_at ? 'Approved' : 'Approve'}
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  onClick={() => handleRequestRevision(delivery)}
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Request Revision
                                </Button>
                              </div>
                            )}
                            
                            {delivery.status === 'revision_requested' && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                  <AlertCircle className="h-4 w-4 inline mr-1" />
                                  Revision requested - our team is working on your feedback
                                </p>
                              </div>
                            )}
                            
                            <Separator />
                            <DeliveryComments deliveryId={delivery.id} clientId={delivery.client_id} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
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

      <TestimonialPrompt
        open={showTestimonialPrompt}
        onOpenChange={setShowTestimonialPrompt}
        clientName={client?.name || ''}
      />
    </div>
  );
}