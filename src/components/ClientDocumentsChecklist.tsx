import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Download, 
  FileText, 
  Check, 
  Clock, 
  MessageSquare,
  ThumbsUp,
  Eye,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { RevisionRequestModal } from "@/components/RevisionRequestModal";

interface Delivery {
  id: string;
  document_type: string;
  document_title: string;
  file_url: string;
  file_path: string;
  status: string;
  delivered_at: string;
  approved_at?: string;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
  delivered: { label: "Ready for Review", icon: Eye, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  revision_requested: { label: "Revision Requested", icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  approved: { label: "Approved", icon: Check, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" }
};

export function ClientDocumentsChecklist() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revisionModalDelivery, setRevisionModalDelivery] = useState<Delivery | null>(null);

  useEffect(() => {
    if (user?.id) fetchDeliveries();
  }, [user]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;
      setClientId(clientData.id);

      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: true });

      setDeliveries((deliveriesData || []) as Delivery[]);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Download Started", description: fileName });
  };

  const handleApprove = async (delivery: Delivery) => {
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', delivery.id);

      if (error) throw error;

      toast({ title: "Document Approved!", description: `${delivery.document_title} has been approved.` });
      fetchDeliveries();
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve document.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter to show resume-related documents first
  const resumeDeliveries = deliveries.filter(d => d.document_type === 'resume');
  const otherDeliveries = deliveries.filter(d => d.document_type !== 'resume');

  const allDeliveries = [...resumeDeliveries, ...otherDeliveries];

  // Get the first/initial resume (for review)
  const initialResume = resumeDeliveries.find(d => d.status === 'delivered');
  const pendingReviewCount = deliveries.filter(d => d.status === 'delivered').length;
  const approvedCount = deliveries.filter(d => d.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">My New Resume Documents!</h1>
            <p className="text-muted-foreground text-sm">
              Review your documents, request revisions, or approve them when ready.
            </p>
            
            {/* Stats */}
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{pendingReviewCount}</p>
                  <p className="text-xs text-muted-foreground">To Review</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Checklist */}
      <div className="space-y-3">
        {allDeliveries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Your Documents Are Being Created</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Our team is working on your resume documents. You'll receive a notification when your initial resume is ready for review.
              </p>
            </CardContent>
          </Card>
        ) : (
          allDeliveries.map((delivery, index) => {
            const statusConfig = STATUS_CONFIG[delivery.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const isResumeDoc = delivery.document_type === 'resume';
            const isFirst = index === 0 && isResumeDoc;
            
            return (
              <Card 
                key={delivery.id} 
                className={`transition-all ${
                  delivery.status === 'delivered' ? 'border-blue-300 dark:border-blue-700 shadow-md' : ''
                } ${isFirst ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Checkbox/Status Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusConfig.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{delivery.document_title}</h3>
                        {isFirst && delivery.status === 'delivered' && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            Ready for Review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                        <span>Delivered {format(new Date(delivery.delivered_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Download */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(delivery.file_url, delivery.document_title)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>

                      {/* Review Actions - only show for delivered status */}
                      {delivery.status === 'delivered' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRevisionModalDelivery(delivery)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Revisions
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(delivery)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Checklist Summary */}
      {allDeliveries.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Document Checklist</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${resumeDeliveries.length > 0 ? 'bg-green-500' : 'bg-muted'}`}>
                  {resumeDeliveries.length > 0 ? <Check className="h-3 w-3 text-white" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className={resumeDeliveries.length > 0 ? '' : 'text-muted-foreground'}>
                  Initial Resume Delivered
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${resumeDeliveries.some(d => d.status === 'approved') ? 'bg-green-500' : 'bg-muted'}`}>
                  {resumeDeliveries.some(d => d.status === 'approved') ? <Check className="h-3 w-3 text-white" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className={resumeDeliveries.some(d => d.status === 'approved') ? '' : 'text-muted-foreground'}>
                  Resume Approved
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision Request Modal */}
      {revisionModalDelivery && clientId && (
        <RevisionRequestModal
          delivery={{
            ...revisionModalDelivery,
            client_id: clientId,
            created_at: revisionModalDelivery.delivered_at,
            updated_at: revisionModalDelivery.delivered_at,
            mime_type: null,
            project_id: null,
            file_size: 0
          }}
          open={!!revisionModalDelivery}
          onOpenChange={(open) => !open && setRevisionModalDelivery(null)}
          onSuccess={() => {
            setRevisionModalDelivery(null);
            fetchDeliveries();
          }}
        />
      )}
    </div>
  );
}