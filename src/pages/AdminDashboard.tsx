import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  FileText,
  Phone,
  Mail,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  created_at: string;
  user_id: string;
  service_type_id?: string;
}

interface IntakeFormData {
  id: string;
  client_id: string;
  action_type: string;
  description: string;
  metadata: any;
  created_at: string;
  client: Client;
}

export default function AdminDashboard() {
  const [intakeForms, setIntakeForms] = useState<IntakeFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<IntakeFormData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchIntakeForms();
  }, []);

  const fetchIntakeForms = async () => {
    try {
      console.log('Fetching intake forms...');
      const { data, error } = await supabase
        .from('client_history')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('action_type', 'intake_form_submitted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching intake forms:', error);
        toast({
          title: "Error",
          description: "Failed to fetch intake forms",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched intake forms:', data);
      setIntakeForms(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error", 
        description: "An error occurred while fetching data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateClientStatus = async (clientId: string, status: string, actionType: string, description: string) => {
    setActionLoading(true);
    try {
      console.log('Updating client status for:', clientId, 'to:', status);
      
      // Update client status for specific client only
      const { data: updatedData, error: clientError } = await supabase
        .from('clients')
        .update({ status })
        .eq('id', clientId)
        .select();

      if (clientError) throw clientError;
      
      console.log('Updated client data:', updatedData);

      // Add history entry
      const { error: historyError } = await supabase
        .from('client_history')
        .insert({
          client_id: clientId,
          action_type: actionType,
          description: description,
          metadata: { previous_status: 'active', new_status: status }
        });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: `Client ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      // Refresh data
      fetchIntakeForms();
      setSelectedForm(null);
    } catch (error) {
      console.error('Error updating client status:', error);
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const exportClientData = async (format: 'json' | 'csv' = 'json') => {
    try {
      setActionLoading(true);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`https://gxatnnzwaggcvzzurgsq.supabase.co/functions/v1/export-client-data?format=${format}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const data = format === 'csv' ? await response.text() : await response.json();

      

      // Create download link
      const blob = new Blob([format === 'csv' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-data-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Client data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export client data",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Pending Review</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading intake forms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
            <p className="text-slate-600">Review and manage client intake forms</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => exportClientData('csv')}
              disabled={actionLoading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button
              onClick={() => exportClientData('json')}
              disabled={actionLoading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({intakeForms.filter(f => f.client.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({intakeForms.filter(f => f.client.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({intakeForms.filter(f => f.client.status === 'rejected').length})</TabsTrigger>
          <TabsTrigger value="all">All ({intakeForms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <IntakeFormsList 
            forms={intakeForms.filter(f => f.client.status === 'active')}
            onViewForm={setSelectedForm}
            getStatusBadge={getStatusBadge}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <IntakeFormsList 
            forms={intakeForms.filter(f => f.client.status === 'approved')}
            onViewForm={setSelectedForm}
            getStatusBadge={getStatusBadge}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <IntakeFormsList 
            forms={intakeForms.filter(f => f.client.status === 'rejected')}
            onViewForm={setSelectedForm}
            getStatusBadge={getStatusBadge}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <IntakeFormsList 
            forms={intakeForms}
            onViewForm={setSelectedForm}
            getStatusBadge={getStatusBadge}
            formatDate={formatDate}
          />
        </TabsContent>
      </Tabs>

      {/* Form Detail Modal/Sidebar */}
      {selectedForm && (
        <FormDetailModal
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onApprove={() => updateClientStatus(selectedForm.client_id, 'approved', 'intake_approved', 'Admin approved intake form')}
          onReject={() => updateClientStatus(selectedForm.client_id, 'rejected', 'intake_rejected', 'Admin rejected intake form')}
          actionLoading={actionLoading}
          getStatusBadge={getStatusBadge}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

interface IntakeFormsListProps {
  forms: IntakeFormData[];
  onViewForm: (form: IntakeFormData) => void;
  getStatusBadge: (status: string) => JSX.Element;
  formatDate: (date: string) => string;
}

function IntakeFormsList({ forms, onViewForm, getStatusBadge, formatDate }: IntakeFormsListProps) {
  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600">No intake forms found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {forms.map((form) => (
        <Card key={form.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{form.client.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{form.client.email}</span>
                    </div>
                    {form.client.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{form.client.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(form.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(form.client.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewForm(form)}
                  className="flex items-center space-x-1"
                >
                  <Eye className="h-4 w-4" />
                  <span>Review</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface FormDetailModalProps {
  form: IntakeFormData;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  formatDate: (date: string) => string;
}

function FormDetailModal({ form, onClose, onApprove, onReject, actionLoading, getStatusBadge, formatDate }: FormDetailModalProps) {
  const metadata = form.metadata || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Intake Form Review</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{form.client.name}</h3>
              <p className="text-sm text-slate-600">{form.client.email}</p>
            </div>
            {getStatusBadge(form.client.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Submission Details</h4>
            <p className="text-sm text-slate-600">Submitted: {formatDate(form.created_at)}</p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Form Data</h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium capitalize text-sm text-slate-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                  </span>
                  <p className="text-sm text-slate-600 mt-1">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {form.client.status === 'active' && (
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={onApprove}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                onClick={onReject}
                disabled={actionLoading}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Reject'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}