import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  TrendingUp
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

interface ClientHistory {
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

export function AdminCommandCenter() {
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [actionNeededFilter, setActionNeededFilter] = useState<boolean>(false);

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
        const clientHistory = historyData?.filter(h => h.client_id === client.id) || [];
        const lastActivity = clientHistory[0];
        
        // Determine next action based on status and history
        let nextAction = "Review client status";
        if (client.status === "active" && client.payment_status === "pending") {
          nextAction = "Follow up on payment";
        } else if (client.status === "active" && !clientHistory.some(h => h.action_type === "intake_form_completed")) {
          nextAction = "Send intake form";
        } else if (urgency === 'overdue') {
          nextAction = "Urgent: Deliver project";
        } else if (urgency === 'due-today') {
          nextAction = "Complete and deliver today";
        } else if (urgency === 'rush') {
          nextAction = "Rush delivery required";
        }

        // Count files (placeholder - could be enhanced with actual file count)
        const filesCount = clientHistory.filter(h => h.action_type === 'file_uploaded').length;

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
          <h2 className="text-3xl font-bold">RDR Project Portal - Admin Command Center</h2>
          <p className="text-muted-foreground">Master view of all clients and projects</p>
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
                      <Button size="sm" variant="outline">
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
    </div>
  );
}