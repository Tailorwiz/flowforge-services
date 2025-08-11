import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  User, 
  Package, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  CheckSquare,
  Users,
  Filter,
  Search,
  Eye,
  TrendingUp,
  Download,
  File,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  History,
  BookOpen
} from "lucide-react";


interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  payment_status: string;
  estimated_delivery_date: string | null;
  created_at: string;
  is_rush: boolean;
  rush_deadline: string | null;
  service_types: {
    id: string;
    name: string;
    default_timeline_days: number;
    tags: string[];
  };
}

interface ClientActivityHistory {
  id: string;
  client_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface ExtendedClient extends Client {
  urgency: 'rush' | 'overdue' | 'due-today' | 'due-tomorrow' | 'on-track';
  files_count: number;
  last_activity: string;
  last_activity_date: string;
  next_action: string;
  days_until_due: number;
}

interface ClientFile {
  id: string;
  description: string;
  created_at: string;
  metadata: any;
}

interface ClientHistory {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata: any;
}

export function AdminCommandCenter() {
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [actionNeededFilter, setActionNeededFilter] = useState<boolean>(false);
  const [viewingClient, setViewingClient] = useState<ExtendedClient | null>(null);
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([]);
  const [clientHistory, setClientHistory] = useState<ClientHistory[]>([]);
const [loadingClientData, setLoadingClientData] = useState(false);
  const [clientTrainingMaterials, setClientTrainingMaterials] = useState<any[]>([]);

  useEffect(() => {
    fetchClientsData();
  }, []);

  const fetchClientsData = async () => {
    try {
      setLoading(true);
      
      // Fetch clients with service types
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(`
          *,
          service_types (*)
        `)
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch client history for activity tracking
      const { data: historyData, error: historyError } = await supabase
        .from("client_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Process clients data
      const processedClients: ExtendedClient[] = (clientsData || []).map(client => {
        const today = new Date();
        const dueDate = new Date(client.estimated_delivery_date || client.created_at);
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Determine urgency
        let urgency: ExtendedClient['urgency'] = 'on-track';
        if (client.is_rush) {
          urgency = 'rush';
        } else if (daysDiff < 0) {
          urgency = 'overdue';
        } else if (daysDiff === 0) {
          urgency = 'due-today';
        } else if (daysDiff === 1) {
          urgency = 'due-tomorrow';
        }

        // Get last activity
        const clientHistoryData = historyData?.filter(h => h.client_id === client.id) || [];
        const lastActivity = clientHistoryData[0];
        
        // Determine next action based on status and history
        let nextAction = "Review client status";
        if (client.status === "active" && client.payment_status === "pending") {
          nextAction = "Follow up on payment";
        } else if (client.status === "active" && !clientHistoryData.some(h => h.action_type === "intake_form_completed")) {
          nextAction = "Send intake form";
        } else if (urgency === 'overdue') {
          nextAction = "Urgent: Deliver project";
        } else if (urgency === 'due-today') {
          nextAction = "Complete and deliver today";
        } else if (urgency === 'rush') {
          nextAction = "Rush delivery required";
        }

        // Count files (placeholder - could be enhanced with actual file count)
        const filesCount = clientHistoryData.filter(h => h.action_type === 'file_uploaded').length;

        return {
          ...client,
          urgency,
          files_count: filesCount,
          last_activity: lastActivity?.description || "No recent activity",
          last_activity_date: lastActivity?.created_at || client.created_at,
          next_action: nextAction,
          days_until_due: daysDiff
        };
      });

      setClients(processedClients);
    } catch (error) {
      console.error("Error fetching clients data:", error);
      toast({
        title: "Error",
        description: "Failed to load command center data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        client.name.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.service_types.name.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;

      // Due date filter
      let matchesDueDate = true;
      if (dueDateFilter === "today") {
        matchesDueDate = client.urgency === 'due-today';
      } else if (dueDateFilter === "tomorrow") {
        matchesDueDate = client.urgency === 'due-tomorrow';
      } else if (dueDateFilter === "overdue") {
        matchesDueDate = client.urgency === 'overdue';
      } else if (dueDateFilter === "this-week") {
        matchesDueDate = client.days_until_due >= 0 && client.days_until_due <= 7;
      }

      // Package filter
      const matchesPackage = packageFilter === "all" || 
        client.service_types.name.toLowerCase().includes(packageFilter.toLowerCase());

      // Urgency filter
      const matchesUrgency = urgencyFilter === "all" || client.urgency === urgencyFilter;

      // Action needed filter
      const matchesActionNeeded = !actionNeededFilter || 
        client.urgency === 'overdue' || 
        client.urgency === 'due-today' || 
        client.payment_status === 'pending' ||
        client.urgency === 'rush';

      return matchesSearch && matchesStatus && matchesDueDate && 
             matchesPackage && matchesUrgency && matchesActionNeeded;
    });
  }, [clients, searchQuery, statusFilter, dueDateFilter, packageFilter, urgencyFilter, actionNeededFilter]);

  const getUrgencyBadge = (urgency: ExtendedClient['urgency']) => {
    const variants = {
      'rush': 'destructive',
      'overdue': 'destructive', 
      'due-today': 'default',
      'due-tomorrow': 'secondary',
      'on-track': 'outline'
    } as const;

    const labels = {
      'rush': 'RUSH',
      'overdue': 'OVERDUE',
      'due-today': 'DUE TODAY',
      'due-tomorrow': 'DUE TOMORROW',
      'on-track': 'ON TRACK'
    };

    return (
      <Badge variant={variants[urgency]} className="font-semibold">
        {labels[urgency]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': 'default',
      'completed': 'secondary',
      'on-hold': 'outline',
      'cancelled': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const fetchClientFiles = async (clientId: string) => {
    try {
      // Fetch uploaded documents for this client
      const { data, error } = await supabase
        .from('document_uploads' as any)
        .select('id, original_name, file_path, bucket_name, created_at, file_size')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate accessible URLs (signed for private buckets)
      const filesWithUrls = await Promise.all((data || []).map(async (row: any) => {
        let url: string | null = null;
        const bucket = row.bucket_name;
        const path = row.file_path;
        try {
          if (bucket && path) {
            // Try signed URL (works for private); fall back to public if bucket is public
            const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
            url = signed?.signedUrl || supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          }
        } catch (_) {}
        return {
          id: row.id,
          description: row.original_name || 'Uploaded file',
          created_at: row.created_at,
          metadata: {
            fileName: row.original_name,
            fileSize: row.file_size,
            fileUrl: url,
            filePath: path,
            bucketName: bucket,
          },
        } as ClientFile;
      }));

      setClientFiles(filesWithUrls);
    } catch (error) {
      console.error('Error fetching client files:', error);
      setClientFiles([]);
    }
  };

  const fetchClientHistory = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("client_history")
        .select("id, action_type, description, created_at, metadata")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setClientHistory(data || []);
    } catch (error) {
      console.error("Error fetching client history:", error);
      setClientHistory([]);
    }
  };

  const handleViewClient = async (client: ExtendedClient) => {
    setViewingClient(client);
    setLoadingClientData(true);
    
    try {
      await Promise.all([
        fetchClientFiles(client.id),
        fetchClientHistory(client.id),
        (async () => {
          // Fetch training materials allowed for this client (by service type + manual access)
          const serviceTypeId = (client as any).service_types?.id || (client as any).service_type_id;
          const [serviceMap, manualAccess] = await Promise.all([
            supabase.from('service_training_materials').select('training_material_id').eq('service_type_id', serviceTypeId),
            supabase.from('client_training_access').select('training_material_id').eq('client_id', client.id),
          ]);

          const serviceIds = (serviceMap.data || []).map((r: any) => r.training_material_id);
          const manualIds = (manualAccess.data || []).map((r: any) => r.training_material_id);
          const materialIds = Array.from(new Set([...serviceIds, ...manualIds])).filter(Boolean);

          if (materialIds.length === 0) {
            setClientTrainingMaterials([]);
            return;
          }

          const { data: materials } = await supabase
            .from('training_materials')
            .select('*')
            .in('id', materialIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          setClientTrainingMaterials(materials || []);
        })()
      ]);
    } catch (error) {
      console.error("Error loading client data:", error);
      toast({
        title: "Error",
        description: "Failed to load client information",
        variant: "destructive"
      });
    } finally {
      setLoadingClientData(false);
    }
  };

  const handleDownloadFile = (file: ClientFile) => {
    // Extract file information from metadata
    const fileName = file.metadata?.fileName || 'file';
    const fileUrl = file.metadata?.fileUrl;
    
    if (fileUrl) {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast({
        title: "Error", 
        description: "File URL not found",
        variant: "destructive"
      });
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'file_uploaded': return <File className="w-4 h-4" />;
      case 'client_created_via_upload': return <User className="w-4 h-4" />;
      case 'onboarding_triggered': return <MessageSquare className="w-4 h-4" />;
      case 'rush_enabled': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'rush_disabled': return <Clock className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Master View of All Clients and Projects</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          {filteredClients.length} of {clients.length} clients
        </div>
      </div>


      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Rush Orders</p>
                <p className="text-2xl font-bold text-red-600">
                  {clients.filter(c => c.urgency === 'rush').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Due Today</p>
                <p className="text-2xl font-bold text-orange-600">
                  {clients.filter(c => c.urgency === 'due-today').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {clients.filter(c => c.urgency === 'overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Need Action</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.filter(c => 
                    c.urgency === 'overdue' || 
                    c.urgency === 'due-today' || 
                    c.payment_status === 'pending' ||
                    c.urgency === 'rush'
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients, emails, packages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="tomorrow">Due Tomorrow</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
              </SelectContent>
            </Select>

            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Packages</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="rush">Rush</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="due-today">Due Today</SelectItem>
                <SelectItem value="on-track">On Track</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant={actionNeededFilter ? "default" : "outline"}
              onClick={() => setActionNeededFilter(!actionNeededFilter)}
              className="whitespace-nowrap"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Action Needed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Package Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium cursor-pointer hover:text-primary">
                          {client.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {client.email}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{client.service_types.name}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(client.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(client.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {client.estimated_delivery_date ? 
                          new Date(client.estimated_delivery_date).toLocaleDateString() : 
                          'Not set'
                        }
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getUrgencyBadge(client.urgency)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{client.files_count}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1 max-w-48">
                        <p className="text-sm truncate">{client.last_activity}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(client.last_activity_date).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <p className="text-sm font-medium max-w-32 truncate">
                        {client.next_action}
                      </p>
                    </TableCell>
                    
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewClient(client)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No clients match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Overview Dialog */}
      <Dialog open={viewingClient !== null} onOpenChange={() => setViewingClient(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {viewingClient?.name} - Client Overview
            </DialogTitle>
          </DialogHeader>
          
          {viewingClient && (
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="files">Files ({clientFiles.length})</TabsTrigger>
                  <TabsTrigger value="training">Training ({clientTrainingMaterials.length})</TabsTrigger>
                  <TabsTrigger value="history">Activity History</TabsTrigger>
                  <TabsTrigger value="details">Service Details</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto mt-4">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    {loadingClientData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="ml-2">Loading client information...</p>
                      </div>
                    ) : (
                      <>
                        {/* Client Basic Info */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <User className="w-5 h-5" />
                              Contact Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Name:</span>
                                <span>{viewingClient.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Email:</span>
                                <span>{viewingClient.email}</span>
                              </div>
                              {viewingClient.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">Phone:</span>
                                  <span>{viewingClient.phone}</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Client Since:</span>
                                <span>{new Date(viewingClient.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Payment Status:</span>
                                <Badge variant={viewingClient.payment_status === 'paid' ? 'default' : 'secondary'}>
                                  {viewingClient.payment_status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Status & Urgency */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Status & Priority
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Current Status</Label>
                              <div className="mt-1">
                                {getStatusBadge(viewingClient.status)}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Urgency Level</Label>
                              <div className="mt-1">
                                {getUrgencyBadge(viewingClient.urgency)}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Next Action</Label>
                              <p className="text-sm mt-1">{viewingClient.next_action}</p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Clock className="w-5 h-5" />
                              Project Timeline
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Due Date</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>
                                  {viewingClient.estimated_delivery_date ? 
                                    new Date(viewingClient.estimated_delivery_date).toLocaleDateString() : 
                                    'Not set'
                                  }
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Days Until Due</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className={viewingClient.days_until_due < 0 ? 'text-red-600 font-medium' : ''}>
                                  {viewingClient.days_until_due} days
                                  {viewingClient.days_until_due < 0 && ' (Overdue)'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </TabsContent>

                  {/* Files Tab */}
                  <TabsContent value="files" className="space-y-4">
                    {loadingClientData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="ml-2">Loading files...</p>
                      </div>
                    ) : clientFiles.length > 0 ? (
                      <div className="space-y-4">
                        {clientFiles.map((file) => (
                          <Card key={file.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <File className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                                  <div className="space-y-2 flex-1">
                                    <h4 className="font-medium">{file.description}</h4>
                                    <div className="text-sm text-muted-foreground">
                                      <p>Uploaded: {new Date(file.created_at).toLocaleString()}</p>
                                      {file.metadata?.fileName && (
                                        <p>File: {file.metadata.fileName}</p>
                                      )}
                                      {file.metadata?.fileSize && (
                                        <p>Size: {(file.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadFile(file)}
                                  disabled={!file.metadata?.fileUrl}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">No files uploaded yet</p>
                        <p className="text-sm text-muted-foreground">Files will appear here once the client uploads them</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Training Tab */}
                  <TabsContent value="training" className="space-y-4">
                    {loadingClientData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="ml-2">Loading training...</p>
                      </div>
                    ) : clientTrainingMaterials.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clientTrainingMaterials.map((material: any) => (
                          <Card key={material.id} className="group hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-3">
                                <div className="w-full aspect-[16/9] bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                  {material.thumbnail_url ? (
                                    <img src={material.thumbnail_url} alt={`${material.name} training thumbnail`} className="w-full h-full object-cover" />
                                  ) : (
                                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium">{material.name}</h4>
                                  {material.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{material.description}</p>
                                  )}
                                </div>
                                {material.content_url && (
                                  <Button asChild size="sm" className="self-start">
                                    <a href={material.content_url} target="_blank" rel="noopener noreferrer">
                                      <BookOpen className="w-4 h-4 mr-2" />
                                      Open Material
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No training materials assigned for this client</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activity History Tab */}
                  <TabsContent value="history" className="space-y-4">
                    {loadingClientData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="ml-2">Loading activity history...</p>
                      </div>
                    ) : clientHistory.length > 0 ? (
                      <div className="space-y-3">
                        {clientHistory.map((activity) => (
                          <Card key={activity.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {getActionTypeIcon(activity.action_type)}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{formatActionType(activity.action_type)}</h4>
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(activity.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">No activity history yet</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Service Details Tab */}
                  <TabsContent value="details" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Service Package
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Package Name</Label>
                          <p className="text-lg font-semibold mt-1">{viewingClient.service_types.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Default Timeline</Label>
                          <p className="mt-1">{viewingClient.service_types.default_timeline_days} days</p>
                        </div>
                        {viewingClient.service_types.tags && viewingClient.service_types.tags.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium">Service Tags</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {viewingClient.service_types.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}