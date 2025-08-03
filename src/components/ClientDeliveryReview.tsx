import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, CheckCircle, Edit3, FileText, Eye, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { RevisionRequestModal } from './RevisionRequestModal';
import { DeliveryComments } from './DeliveryComments';

interface Delivery {
  id: string;
  client_id: string;
  document_title: string;
  document_type: string;
  file_url: string;
  file_path: string;
  status: string;
  created_at: string;
  updated_at: string;
  delivered_at: string;
  approved_at: string | null;
  file_size: number | null;
  mime_type: string | null;
  project_id: string | null;
}

interface ClientDeliveryReviewProps {
  clientId: string;
}

export default function ClientDeliveryReview({ clientId }: ClientDeliveryReviewProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, [clientId]);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load your deliveries. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDelivery = async (deliveryId: string) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;

      // Update local state
      setDeliveries(prev => 
        prev.map(d => 
          d.id === deliveryId 
            ? { ...d, status: 'approved', updated_at: new Date().toISOString() }
            : d
        )
      );

      toast({
        title: "Delivery Approved!",
        description: "Thank you for approving your documents. Your project is now complete!",
      });

      // TODO: Trigger notification to admin about approval
      
    } catch (error) {
      console.error('Error approving delivery:', error);
      toast({
        title: "Error",
        description: "Failed to approve delivery. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRequestRevision = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowRevisionModal(true);
  };

  const handleRevisionSubmitted = () => {
    setShowRevisionModal(false);
    setSelectedDelivery(null);
    fetchDeliveries(); // Refresh to show updated status
    toast({
      title: "Revision Request Submitted",
      description: "We'll review your feedback and get back to you with updates soon!",
    });
  };

  const handleDownload = async (fileUrl: string, fileName?: string) => {
    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `Downloading ${fileName || 'document'}...`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'revision_requested': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved & Complete';
      case 'revision_requested': return 'Revision Requested';
      case 'delivered': return 'Ready for Review';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Deliveries Yet</h3>
          <p className="text-muted-foreground">
            Your completed documents will appear here when they're ready for review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Delivered Documents</h2>
        <Badge variant="outline" className="text-sm">
          {deliveries.length} {deliveries.length === 1 ? 'Delivery' : 'Deliveries'}
        </Badge>
      </div>

      {deliveries.map((delivery) => (
        <Card key={delivery.id} className="shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {delivery.document_title}
                  <Badge variant="secondary" className="text-xs">
                    {delivery.document_type}
                  </Badge>
                </CardTitle>
              </div>
              <Badge className={getStatusColor(delivery.status)}>
                {getStatusText(delivery.status)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Delivered on {format(new Date(delivery.delivered_at), 'PPP')}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* File Downloads Section */}
            {delivery.file_url && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Your Document
                </h4>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {delivery.document_title}
                      </span>
                      {delivery.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(delivery.file_size / 1024)} KB
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(delivery.file_url, delivery.document_title)}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {delivery.status !== 'approved' && (
                <>
                  <Button
                    onClick={() => handleApproveDelivery(delivery.id)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Finalize
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleRequestRevision(delivery)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Request Revisions
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                onClick={() => setShowComments(showComments === delivery.id ? null : delivery.id)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {showComments === delivery.id ? 'Hide' : 'Show'} Comments
              </Button>
            </div>

            {/* Comments Section */}
            {showComments === delivery.id && (
              <div className="mt-4 pt-4 border-t">
                <DeliveryComments 
                  deliveryId={delivery.id}
                  clientId={clientId}
                />
              </div>
            )}

            {/* Help Text */}
            {delivery.status === 'delivered' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>No call needed!</strong> If you'd like changes, just use the "Request Revisions" button above to give feedback quickly and easily. We'll get right to work on your updates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Revision Request Modal */}
      {selectedDelivery && (
        <RevisionRequestModal
          delivery={selectedDelivery}
          open={showRevisionModal}
          onOpenChange={setShowRevisionModal}
          onSuccess={handleRevisionSubmitted}
        />
      )}
    </div>
  );
}