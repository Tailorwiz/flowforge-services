import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Calendar, CheckCircle } from "lucide-react";
import { DocumentUploadParser } from "./DocumentUploadParser";

interface ServiceType {
  id: string;
  name: string;
  description: string;
  default_timeline_days: number;
  tags: string[];
  price_cents: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  service_type_id: string;
  status: string;
  payment_status: string;
  phone: string | null;
  estimated_delivery_date: string | null;
  created_at: string;
  service_types: ServiceType;
}

export function ClientManager() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    service_type_id: "",
    phone: ""
  });

  useEffect(() => {
    fetchServiceTypes();
    fetchClients();
  }, []);

  const fetchServiceTypes = async () => {
    const { data, error } = await supabase
      .from("service_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load service types", variant: "destructive" });
    } else {
      setServiceTypes(data || []);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        service_types (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load clients", variant: "destructive" });
    } else {
      setClients(data || []);
    }
  };

  const triggerOnboardingAutomation = async (clientId: string, serviceTypeId: string) => {
    try {
      // Log the onboarding trigger
      await supabase.from("client_history").insert({
        client_id: clientId,
        action_type: "onboarding_triggered",
        description: "Automatic onboarding initiated based on service type",
        metadata: { service_type_id: serviceTypeId }
      });

      toast({ title: "Success", description: "Onboarding automation triggered successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to trigger onboarding automation", variant: "destructive" });
    }
  };

  const addClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.service_type_id) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const serviceType = serviceTypes.find(st => st.id === newClient.service_type_id);
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + (serviceType?.default_timeline_days || 7));

    const { data, error } = await supabase
      .from("clients")
      .insert([{
        ...newClient,
        user_id: "00000000-0000-0000-0000-000000000000", // Replace with actual user ID when auth is implemented
        estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
        payment_status: "pending"
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to add client", variant: "destructive" });
    } else {
      // Trigger onboarding automation
      await triggerOnboardingAutomation(data.id, newClient.service_type_id);
      
      toast({ title: "Success", description: "Client added and onboarding triggered" });
      setNewClient({ name: "", email: "", service_type_id: "", phone: "" });
      setIsAddingClient(false);
      fetchClients();
    }
  };

  const updateClientService = async (clientId: string, newServiceTypeId: string) => {
    const serviceType = serviceTypes.find(st => st.id === newServiceTypeId);
    const newDeliveryDate = new Date();
    newDeliveryDate.setDate(newDeliveryDate.getDate() + (serviceType?.default_timeline_days || 7));

    const { error } = await supabase
      .from("clients")
      .update({
        service_type_id: newServiceTypeId,
        estimated_delivery_date: newDeliveryDate.toISOString().split('T')[0]
      })
      .eq("id", clientId);

    if (error) {
      toast({ title: "Error", description: "Failed to update client service", variant: "destructive" });
    } else {
      // Trigger new onboarding
      await triggerOnboardingAutomation(clientId, newServiceTypeId);
      
      // Log the service change
      await supabase.from("client_history").insert({
        client_id: clientId,
        action_type: "service_changed",
        description: `Service type changed to ${serviceType?.name}`,
        metadata: { old_service_type_id: clientId, new_service_type_id: newServiceTypeId }
      });

      toast({ title: "Success", description: "Client service updated and re-onboarded" });
      fetchClients();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Client Management</h2>
        <Button onClick={() => setIsAddingClient(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <DocumentUploadParser 
        serviceTypes={serviceTypes} 
        onClientCreated={() => {
          fetchClients();
          setIsAddingClient(false);
        }} 
      />

      {isAddingClient && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({...newClient, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="service_type">Service Type *</Label>
              <Select onValueChange={(value) => setNewClient({...newClient, service_type_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((serviceType) => (
                    <SelectItem key={serviceType.id} value={serviceType.id}>
                      {serviceType.name} ({serviceType.default_timeline_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addClient}>Add Client</Button>
              <Button variant="outline" onClick={() => setIsAddingClient(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {client.name}
                  </h3>
                  <p className="text-muted-foreground">{client.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status}
                  </Badge>
                  <Badge variant={client.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {client.payment_status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Service Type</Label>
                  <Select
                    value={client.service_type_id}
                    onValueChange={(value) => updateClientService(client.id, value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((serviceType) => (
                        <SelectItem key={serviceType.id} value={serviceType.id}>
                          {serviceType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Estimated Delivery</Label>
                  <div className="flex items-center mt-1">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {client.estimated_delivery_date ? 
                        new Date(client.estimated_delivery_date).toLocaleDateString() : 
                        'Not set'
                      }
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {client.service_types.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Created: {new Date(client.created_at).toLocaleDateString()} • 
                Timeline: {client.service_types.default_timeline_days} days • 
                Payment: {client.payment_status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}