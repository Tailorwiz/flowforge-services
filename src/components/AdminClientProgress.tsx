import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ClientDeliverableProgress {
  client_id: string;
  client_name: string;
  client_email: string;
  service_type_id: string;
  deliverable_name: string;
  deliverable_category: string;
  deliverable_description: string;
  expected_quantity: number;
  delivery_id: string | null;
  document_title: string | null;
  document_type: string | null;
  file_url: string | null;
  delivery_status: string | null;
  delivered_at: string | null;
  approved_at: string | null;
}

interface ClientProgress {
  [clientId: string]: {
    client_name: string;
    client_email: string;
    deliverables: {
      [deliverableName: string]: {
        deliverable_category: string;
        deliverable_description: string;
        expected_quantity: number;
        completed_count: number;
        deliveries: Array<{
          delivery_id: string;
          document_title: string;
          document_type: string;
          file_url: string;
          delivery_status: string;
          delivered_at: string;
          approved_at: string | null;
        }>;
      };
    };
  };
}

export function AdminClientProgress() {
  const [clientProgress, setClientProgress] = useState<ClientProgress>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientProgress();
  }, []);

  const fetchClientProgress = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_client_overview');
      if (error) throw error;

      console.log('Raw client overview data:', data);

      // Transform the data into grouped client progress
      const progressData: ClientProgress = {};
      
      data?.forEach((item: ClientDeliverableProgress) => {
        if (!progressData[item.client_id]) {
          progressData[item.client_id] = {
            client_name: item.client_name,
            client_email: item.client_email,
            deliverables: {}
          };
        }

        if (!progressData[item.client_id].deliverables[item.deliverable_name]) {
          progressData[item.client_id].deliverables[item.deliverable_name] = {
            deliverable_category: item.deliverable_category,
            deliverable_description: item.deliverable_description,
            expected_quantity: item.expected_quantity,
            completed_count: 0,
            deliveries: []
          };
        }

        // Add delivery if it exists
        if (item.delivery_id && item.delivery_status) {
          progressData[item.client_id].deliverables[item.deliverable_name].deliveries.push({
            delivery_id: item.delivery_id,
            document_title: item.document_title || '',
            document_type: item.document_type || '',
            file_url: item.file_url || '',
            delivery_status: item.delivery_status,
            delivered_at: item.delivered_at || '',
            approved_at: item.approved_at
          });

          // Count completed deliveries
          if (item.delivery_status === 'delivered' || item.delivery_status === 'approved') {
            progressData[item.client_id].deliverables[item.deliverable_name].completed_count++;
          }
        }
      });

      setClientProgress(progressData);
    } catch (error) {
      console.error('Error fetching client progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeliverableStatus = (completed: number, expected: number) => {
    if (completed === 0) return { label: 'Pending', color: 'bg-gray-500', icon: Clock };
    if (completed < expected) return { label: 'In Progress', color: 'bg-blue-500', icon: AlertCircle };
    return { label: 'Complete', color: 'bg-green-500', icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading client progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Client Delivery Progress</h2>
      </div>

      {Object.keys(clientProgress).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No client data found</h3>
            <p className="text-muted-foreground">Client deliverable progress will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(clientProgress).map(([clientId, client]) => (
            <Card key={clientId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {client.client_name}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({client.client_email})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(client.deliverables).map(([deliverableName, deliverable]) => {
                  const status = getDeliverableStatus(deliverable.completed_count, deliverable.expected_quantity);
                  const StatusIcon = status.icon;
                  const progressPercentage = (deliverable.completed_count / deliverable.expected_quantity) * 100;

                  return (
                    <div key={deliverableName} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">{deliverableName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {deliverable.completed_count}/{deliverable.expected_quantity}
                          </Badge>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">{deliverable.deliverable_description}</p>

                      {deliverable.expected_quantity > 1 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{deliverable.completed_count}/{deliverable.expected_quantity}</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                      )}

                      {deliverable.deliveries.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Delivered Items:</h4>
                          {deliverable.deliveries.map((delivery) => (
                            <div key={delivery.delivery_id} className="bg-muted/50 rounded p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{delivery.document_title}</span>
                                <Badge className={delivery.delivery_status === 'approved' ? 'bg-green-500' : 'bg-blue-500'}>
                                  {delivery.delivery_status}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                Delivered: {format(new Date(delivery.delivered_at), 'MMM dd, yyyy')}
                                {delivery.approved_at && (
                                  <span> • Approved: {format(new Date(delivery.approved_at), 'MMM dd, yyyy')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}