import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  FileText, 
  Upload, 
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Target,
  TrendingUp
} from "lucide-react";

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  payment_status: string;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  service_types: {
    id: string;
    name: string;
    description: string;
    default_timeline_days: number;
    price_cents: number;
    tags: string[];
  };
}

interface ClientHistory {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata: any;
}

interface ClientFile {
  id: string;
  name: string;
  type: string;
  uploaded_at: string;
  url: string;
}

interface TrainingMaterial {
  id: string;
  name: string;
  description: string;
  type: string;
  content_url: string;
  is_active: boolean;
}

export default function ClientDashboard() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [history, setHistory] = useState<ClientHistory[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewUploads, setHasNewUploads] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
      fetchClientHistory();
      fetchClientFiles();
      fetchTrainingMaterials();
      
      // Set up real-time listener for new uploads
      const channel = supabase
        .channel('client-uploads')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_history',
            filter: `client_id=eq.${clientId}`
          },
          (payload) => {
            if (payload.new.action_type === 'file_uploaded') {
              setHasNewUploads(true);
              fetchClientHistory();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          service_types (*)
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("client_history")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching client history:', error);
    }
  };

  const fetchClientFiles = async () => {
    // Mock files data - would integrate with actual file storage
    setFiles([
      {
        id: "1",
        name: "Resume.pdf",
        type: "application/pdf",
        uploaded_at: new Date().toISOString(),
        url: "#"
      }
    ]);
  };

  const fetchTrainingMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("training_materials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrainingMaterials(data || []);
    } catch (error) {
      console.error('Error fetching training materials:', error);
    }
  };

  const getProgressPercentage = () => {
    if (!history.length) return 0;
    
    const stages = ['onboarding_triggered', 'in_progress', 'review', 'delivered'];
    const completedStages = stages.filter(stage => 
      history.some(h => h.action_type === stage)
    );
    
    return (completedStages.length / stages.length) * 100;
  };

  const getDaysUntilDelivery = () => {
    if (!client?.estimated_delivery_date) return null;
    
    const deliveryDate = new Date(client.estimated_delivery_date);
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'completed': return 'default';
      case 'on_hold': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (actionType: string) => {
    switch (actionType) {
      case 'client_created_via_upload': return <User className="w-4 h-4" />;
      case 'onboarding_triggered': return <Mail className="w-4 h-4" />;
      case 'file_uploaded': return <Upload className="w-4 h-4" />;
      case 'in_progress': return <TrendingUp className="w-4 h-4" />;
      case 'review': return <CheckCircle className="w-4 h-4" />;
      case 'delivered': return <Target className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading client dashboard...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Client Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested client could not be found.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Client List
          </Button>
        </div>
      </div>
    );
  }

  const daysUntilDelivery = getDaysUntilDelivery();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <p className="text-muted-foreground">{client.service_types.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasNewUploads && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1" />
                New Upload
              </Badge>
            )}
            <Badge variant={getStatusColor(client.status)}>
              {client.status}
            </Badge>
          </div>
        </div>

        {/* Client Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Started: {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
              <div className="pt-2">
                <Badge variant="outline">${(client.service_types.price_cents / 100).toFixed(2)}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Project Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${progressPercentage >= 25 ? 'bg-primary' : 'bg-muted'}`} />
                    <span>Onboard</span>
                  </div>
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${progressPercentage >= 50 ? 'bg-primary' : 'bg-muted'}`} />
                    <span>Progress</span>
                  </div>
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${progressPercentage >= 75 ? 'bg-primary' : 'bg-muted'}`} />
                    <span>Review</span>
                  </div>
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${progressPercentage >= 100 ? 'bg-primary' : 'bg-muted'}`} />
                    <span>Delivered</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Delivery Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.estimated_delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Target Date</p>
                    <p className="font-medium">{new Date(client.estimated_delivery_date).toLocaleDateString()}</p>
                  </div>
                )}
                {daysUntilDelivery !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Days Remaining</p>
                    <p className={`font-bold text-lg ${daysUntilDelivery <= 2 ? 'text-destructive' : daysUntilDelivery <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                      {daysUntilDelivery > 0 ? daysUntilDelivery : 'Overdue'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Badge variant={client.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {client.payment_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Files
              {files.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  {files.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Status Tracker
            </TabsTrigger>
          </TabsList>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.length > 0 ? (
                    history.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          {getStatusIcon(item.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                          {item.metadata && Object.keys(item.metadata).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(item.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        {index < history.length - 1 && (
                          <Separator orientation="horizontal" className="absolute left-4 mt-8 w-px h-4" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No activity recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Client Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.length > 0 ? (
                    files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No files uploaded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle>Training Materials</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Access your exclusive training materials and resources
                </p>
              </CardHeader>
              <CardContent>
                {client.status === 'active' ? (
                  <div className="grid gap-4">
                    {trainingMaterials.length > 0 ? (
                      trainingMaterials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{material.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {material.type}
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              window.open(material.content_url, '_blank');
                              toast({
                                title: "Download Started",
                                description: `Opening ${material.name}...`
                              });
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No Training Materials Available</p>
                        <p className="text-sm">Training materials will be added by your consultant</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Training Materials Not Available</p>
                    <p className="text-sm">Training materials will be available once your account is activated</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages sent yet</p>
                  <p className="text-sm">Email communications will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tracker Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { stage: 'Onboarding', status: progressPercentage >= 25 ? 'completed' : 'pending', description: 'Initial setup and information gathering' },
                    { stage: 'In Progress', status: progressPercentage >= 50 ? 'completed' : progressPercentage >= 25 ? 'current' : 'pending', description: 'Active work on deliverables' },
                    { stage: 'Review', status: progressPercentage >= 75 ? 'completed' : progressPercentage >= 50 ? 'current' : 'pending', description: 'Quality review and revisions' },
                    { stage: 'Delivered', status: progressPercentage >= 100 ? 'completed' : progressPercentage >= 75 ? 'current' : 'pending', description: 'Final delivery and completion' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                        item.status === 'completed' ? 'bg-green-500' : 
                        item.status === 'current' ? 'bg-blue-500 animate-pulse' : 
                        'bg-muted'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.stage}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge variant={
                        item.status === 'completed' ? 'default' :
                        item.status === 'current' ? 'secondary' :
                        'outline'
                      }>
                        {item.status === 'completed' ? 'Complete' :
                         item.status === 'current' ? 'In Progress' :
                         'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}