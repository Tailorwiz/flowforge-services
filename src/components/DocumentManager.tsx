import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Upload, Eye, Filter, Search, Calendar, User, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GeneralDocumentUpload } from './GeneralDocumentUpload';

interface DocumentUpload {
  id: string;
  client_id?: string;
  uploaded_by?: string;
  intake_form_id?: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  bucket_name: string;
  document_type: string;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    email: string;
  };
  profiles?: {
    display_name: string;
    email: string;
  };
}

interface DocumentManagerProps {
  clientId?: string;
  showClientFilter?: boolean;
  allowUpload?: boolean;
  documentTypes?: string[];
  buckets?: string[];
}

export function DocumentManager({
  clientId,
  showClientFilter = true,
  allowUpload = true,
  documentTypes,
  buckets
}: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { toast } = useToast();

  const DOCUMENT_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'resume', label: 'Resume' },
    { value: 'cover_letter', label: 'Cover Letter' },
    { value: 'template', label: 'Template' },
    { value: 'intake_attachment', label: 'Intake Attachment' },
    { value: 'other', label: 'Other' }
  ];

  const BUCKET_OPTIONS = [
    { value: 'all', label: 'All Locations' },
    { value: 'client-documents', label: 'Client Documents' },
    { value: 'admin-documents', label: 'Admin Documents' },
    { value: 'document-templates', label: 'Document Templates' },
    { value: 'intake-attachments', label: 'Intake Attachments' }
  ];

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'deleted', label: 'Deleted' }
  ];

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('document_uploads')
        .select(`
          *,
          clients(name, email),
          profiles:uploaded_by(display_name, email)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (documentTypes && documentTypes.length > 0) {
        query = query.in('document_type', documentTypes);
      }

      if (buckets && buckets.length > 0) {
        query = query.in('bucket_name', buckets);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    const matchesBucket = selectedBucket === 'all' || doc.bucket_name === selectedBucket;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;

    return matchesSearch && matchesType && matchesBucket && matchesStatus;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const downloadDocument = async (document: DocumentUpload) => {
    try {
      const { data, error } = await supabase.storage
        .from(document.bucket_name)
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${document.original_name}`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const archiveDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('document_uploads')
        .update({ status: 'archived' })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document Archived",
        description: "Document has been archived successfully",
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Archive error:', error);
      toast({
        title: "Archive Failed",
        description: error.message || "Failed to archive document",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      resume: 'bg-blue-100 text-blue-800',
      cover_letter: 'bg-green-100 text-green-800',
      template: 'bg-purple-100 text-purple-800',
      intake_attachment: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const getBucketColor = (bucket: string) => {
    const colors = {
      'client-documents': 'bg-blue-50 text-blue-700 border-blue-200',
      'admin-documents': 'bg-red-50 text-red-700 border-red-200',
      'document-templates': 'bg-purple-50 text-purple-700 border-purple-200',
      'intake-attachments': 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[bucket as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Document Manager</h2>
          <p className="text-slate-600">
            {clientId ? 'Client documents' : 'All documents'} ({filteredDocuments.length} total)
          </p>
        </div>
        {allowUpload && (
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
              </DialogHeader>
              <GeneralDocumentUpload
                clientId={clientId}
                onUploadComplete={() => {
                  setUploadModalOpen(false);
                  fetchDocuments();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Storage Location</label>
              <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUCKET_OPTIONS.map(bucket => (
                    <SelectItem key={bucket.value} value={bucket.value}>
                      {bucket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Size</TableHead>
                    {showClientFilter && <TableHead>Client</TableHead>}
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{doc.original_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDocumentTypeColor(doc.document_type)}>
                          {doc.document_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getBucketColor(doc.bucket_name)}>
                          {doc.bucket_name.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      {showClientFilter && (
                        <TableCell>
                          {doc.clients?.name || 'N/A'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {doc.profiles?.display_name || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {formatDate(doc.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => archiveDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}