import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Download, Folder, FolderOpen, FileText, Check, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

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
}

interface ServiceDeliverable {
  id: string;
  deliverable_name: string;
  deliverable_category: string;
  quantity: number;
}

interface Client {
  id: string;
  service_type_id: string;
}

// Group deliverables by category
const CATEGORY_ORDER = ['Resume Services', 'Career Documents', 'LinkedIn', 'Coaching'];

export function ClientDeliveriesSimple() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [serviceDeliverables, setServiceDeliverables] = useState<ServiceDeliverable[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, service_type_id')
        .eq('user_id', user?.id)
        .single();

      if (!clientData) return;
      setClient(clientData);

      const { data: deliverablesData } = await supabase
        .from('service_deliverables' as any)
        .select('id, deliverable_name, deliverable_category, quantity')
        .eq('service_type_id', clientData.service_type_id)
        .order('deliverable_order');
      
      setServiceDeliverables((deliverablesData as unknown || []) as ServiceDeliverable[]);

      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false });

      setDeliveries((deliveriesData || []) as Delivery[]);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Download Started", description: fileName });
  };

  const toggleFolder = (category: string) => {
    const newOpen = new Set(openFolders);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
    }
    setOpenFolders(newOpen);
  };

  // Group deliverables by category
  const groupedDeliverables = serviceDeliverables.reduce((acc, d) => {
    const cat = d.deliverable_category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {} as Record<string, ServiceDeliverable[]>);

  // Match deliveries to deliverables by document type mapping
  const getDeliveriesForDeliverable = (deliverable: ServiceDeliverable): Delivery[] => {
    const name = deliverable.deliverable_name.toLowerCase();
    return deliveries.filter(d => {
      if (name.includes('resume') && d.document_type === 'resume') return true;
      if (name.includes('cover letter') && d.document_type === 'cover_letter') return true;
      if (name.includes('thank you') && d.document_type === 'thank_you_letter') return true;
      if (name.includes('linkedin') && d.document_type === 'linkedin') return true;
      if (name.includes('bio') && d.document_type === 'bio') return true;
      if (name.includes('outreach') && d.document_type === 'outreach_letter') return true;
      if (name.includes('coaching') && d.document_type === 'coaching_session') return true;
      return false;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sortedCategories = Object.keys(groupedDeliverables).sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a);
    const bIdx = CATEGORY_ORDER.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  // Calculate totals
  const totalExpected = serviceDeliverables.reduce((sum, d) => sum + d.quantity, 0);
  const totalDelivered = deliveries.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Package</h2>
              <p className="text-sm text-muted-foreground">
                {totalDelivered} of {totalExpected} items delivered
              </p>
            </div>
            <Badge variant={totalDelivered === totalExpected ? "default" : "secondary"} className="text-lg px-4 py-1">
              {Math.round((totalDelivered / totalExpected) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Folder View */}
      <div className="space-y-2">
        {sortedCategories.map((category) => {
          const items = groupedDeliverables[category];
          const isOpen = openFolders.has(category);
          
          // Count delivered items in this category
          let catDelivered = 0;
          let catTotal = 0;
          items.forEach(item => {
            catTotal += item.quantity;
            catDelivered += getDeliveriesForDeliverable(item).length;
          });

          return (
            <Collapsible key={category} open={isOpen} onOpenChange={() => toggleFolder(category)}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    {isOpen ? (
                      <FolderOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <Folder className="h-5 w-5 text-primary" />
                    )}
                    <span className="font-medium flex-1">{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {catDelivered}/{catTotal}
                    </Badge>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="ml-6 mt-1 space-y-1">
                  {items.map((deliverable) => {
                    const matchedDeliveries = getDeliveriesForDeliverable(deliverable);
                    const hasDelivery = matchedDeliveries.length > 0;

                    // For multi-quantity items, show each instance
                    if (deliverable.quantity > 1) {
                      return Array.from({ length: deliverable.quantity }, (_, i) => {
                        const instanceDelivery = matchedDeliveries[i];
                        const instanceLabel = `${deliverable.deliverable_name} (${i + 1}/${deliverable.quantity})`;
                        
                        return (
                          <Card key={`${deliverable.id}-${i}`} className="border-l-2 border-l-muted">
                            <CardContent className="p-2 pl-4 flex items-center gap-3">
                              {instanceDelivery ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className={`flex-1 text-sm ${instanceDelivery ? '' : 'text-muted-foreground'}`}>
                                {instanceDelivery ? instanceDelivery.document_title : instanceLabel}
                              </span>
                              {instanceDelivery && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => handleDownload(instanceDelivery.file_url, instanceDelivery.document_title)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      });
                    }

                    // Single item
                    return (
                      <Card key={deliverable.id} className="border-l-2 border-l-muted">
                        <CardContent className="p-2 pl-4 flex items-center gap-3">
                          {hasDelivery ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className={`flex-1 text-sm ${hasDelivery ? '' : 'text-muted-foreground'}`}>
                            {hasDelivery ? matchedDeliveries[0].document_title : deliverable.deliverable_name}
                          </span>
                          {hasDelivery && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleDownload(matchedDeliveries[0].file_url, matchedDeliveries[0].document_title)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {serviceDeliverables.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Your package details will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
