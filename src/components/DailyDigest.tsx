import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Upload, 
  CheckCircle,
  Bell,
  TrendingUp,
  Users
} from "lucide-react";

interface DigestData {
  dueToday: any[];
  dueTomorrow: any[];
  overdue: any[];
  newUploads: any[];
  totalClients: number;
  activeProjects: number;
}

export function DailyDigest() {
  const [digestData, setDigestData] = useState<DigestData>({
    dueToday: [],
    dueTomorrow: [],
    overdue: [],
    newUploads: [],
    totalClients: 0,
    activeProjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDigestData();
  }, []);

  const fetchDigestData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch due today
      const { data: dueToday } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .eq("estimated_delivery_date", today)
        .eq("status", "active");

      // Fetch due tomorrow
      const { data: dueTomorrow } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .eq("estimated_delivery_date", tomorrow)
        .eq("status", "active");

      // Fetch overdue
      const { data: overdue } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .lt("estimated_delivery_date", today)
        .eq("status", "active");

      // Fetch new uploads (last 24 hours)
      const { data: newUploads } = await supabase
        .from("client_history")
        .select(`
          id, client_id, action_type, description, created_at,
          clients!inner (name, email)
        `)
        .eq("action_type", "file_uploaded")
        .gte("created_at", yesterday);

      // Fetch total stats
      const { count: totalClients } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      const { count: activeProjects } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setDigestData({
        dueToday: dueToday || [],
        dueTomorrow: dueTomorrow || [],
        overdue: overdue || [],
        newUploads: newUploads || [],
        totalClients: totalClients || 0,
        activeProjects: activeProjects || 0
      });

    } catch (error) {
      console.error("Error fetching digest data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendDigestEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-digest', {
        body: { 
          force: true,
          userEmail: "admin@resultsdrivenresumes.com"
        }
      });

      if (error) throw error;
      
      // Show success notification
      console.log("Daily digest sent successfully");
    } catch (error) {
      console.error("Error sending digest:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { dueToday, dueTomorrow, overdue, newUploads, totalClients, activeProjects } = digestData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Daily Overview</h2>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Button onClick={sendDigestEmail} variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Send Digest Email
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-orange-600">{dueToday.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Items */}
      {(overdue.length > 0 || dueToday.length > 0) && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Urgent Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdue.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">🚨 Overdue Projects ({overdue.length})</h4>
                  <div className="space-y-2">
                    {overdue.map((client) => (
                      <div key={client.id} className="p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.service_types?.name}</p>
                          </div>
                          <Badge variant="destructive">
                            Due: {new Date(client.estimated_delivery_date).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dueToday.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-600 mb-2">⏰ Due Today ({dueToday.length})</h4>
                  <div className="space-y-2">
                    {dueToday.map((client) => (
                      <div key={client.id} className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.service_types?.name}</p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">
                            Due Today
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Tomorrow */}
      {dueTomorrow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Due Tomorrow ({dueTomorrow.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dueTomorrow.map((client) => (
                <div key={client.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.service_types?.name}</p>
                    </div>
                    <Badge variant="outline">
                      Tomorrow
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Uploads */}
      {newUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              New Client Uploads ({newUploads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {newUploads.map((upload) => (
                <div key={upload.id} className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{upload.clients?.name}</p>
                      <p className="text-sm text-muted-foreground">{upload.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        New
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(upload.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Clear Message */}
      {overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0 && newUploads.length === 0 && (
        <Card className="border-green-200">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 mb-2">All Caught Up! 🎉</h3>
            <p className="text-muted-foreground">
              No urgent items requiring attention today. Great work keeping everything on track!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}