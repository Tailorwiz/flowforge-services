import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Check, X, AlertCircle, User } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ParsedFile {
  file: File;
  clientName: string | null;
  documentType: string | null;
  matchedClient: Client | null;
  status: 'pending' | 'matched' | 'unmatched' | 'uploading' | 'success' | 'error';
  error?: string;
}

// Document type detection from filename
const detectDocumentType = (filename: string): string | null => {
  const lower = filename.toLowerCase();
  if (lower.includes('resume') || lower.includes('cv')) return 'resume';
  if (lower.includes('cover') && lower.includes('letter')) return 'cover_letter';
  if (lower.includes('coverletter')) return 'cover_letter';
  if (lower.includes('thank') && lower.includes('you')) return 'thank_you_letter';
  if (lower.includes('linkedin')) return 'linkedin';
  if (lower.includes('bio')) return 'bio';
  if (lower.includes('outreach')) return 'outreach_letter';
  return 'resume'; // default
};

// Extract client name from filename
// Expected format: ClientName_DocumentType.ext or ClientName - DocumentType.ext
const extractClientName = (filename: string): string | null => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Try underscore separator
  if (nameWithoutExt.includes('_')) {
    return nameWithoutExt.split('_')[0].trim();
  }
  
  // Try dash separator
  if (nameWithoutExt.includes(' - ')) {
    return nameWithoutExt.split(' - ')[0].trim();
  }
  
  // Try hyphen separator
  if (nameWithoutExt.includes('-')) {
    return nameWithoutExt.split('-')[0].trim();
  }
  
  return null;
};

// Fuzzy match client name
const matchClient = (extractedName: string, clients: Client[]): Client | null => {
  if (!extractedName) return null;
  
  const normalizedSearch = extractedName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact match first
  const exactMatch = clients.find(c => 
    c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSearch
  );
  if (exactMatch) return exactMatch;
  
  // Partial match (search name contained in client name or vice versa)
  const partialMatch = clients.find(c => {
    const normalizedClient = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedClient.includes(normalizedSearch) || normalizedSearch.includes(normalizedClient);
  });
  if (partialMatch) return partialMatch;
  
  // First name match
  const firstNameMatch = clients.find(c => {
    const firstName = c.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return firstName === normalizedSearch || normalizedSearch.includes(firstName);
  });
  
  return firstNameMatch || null;
};

export function BulkDeliveryUpload() {
  const [clients, setClients] = useState<Client[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch clients on mount
  useState(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name');
      setClients(data || []);
    };
    fetchClients();
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const parsed: ParsedFile[] = acceptedFiles.map(file => {
      const clientName = extractClientName(file.name);
      const documentType = detectDocumentType(file.name);
      const matchedClient = clientName ? matchClient(clientName, clients) : null;

      return {
        file,
        clientName,
        documentType,
        matchedClient,
        status: matchedClient ? 'matched' : 'unmatched'
      };
    });

    setParsedFiles(prev => [...prev, ...parsed]);
  }, [clients]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const removeFile = (index: number) => {
    setParsedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMatched = async () => {
    const matchedFiles = parsedFiles.filter(f => f.status === 'matched' && f.matchedClient);
    
    if (matchedFiles.length === 0) {
      toast({ title: "No Matches", description: "No files matched to clients.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < matchedFiles.length; i++) {
      const pf = matchedFiles[i];
      const idx = parsedFiles.findIndex(f => f.file === pf.file);
      
      // Update status to uploading
      setParsedFiles(prev => prev.map((f, j) => 
        j === idx ? { ...f, status: 'uploading' } : f
      ));

      try {
        // Upload to storage
        const fileName = `${Date.now()}_${pf.file.name}`;
        const filePath = `${pf.matchedClient!.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-deliveries')
          .upload(filePath, pf.file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('client-deliveries')
          .getPublicUrl(filePath);

        // Create delivery record
        const { error: dbError } = await supabase.from('deliveries').insert({
          client_id: pf.matchedClient!.id,
          document_type: pf.documentType || 'resume',
          document_title: pf.file.name.replace(/\.[^.]+$/, ''),
          file_url: urlData.publicUrl,
          file_path: filePath,
          file_size: pf.file.size,
          status: 'delivered',
          delivered_at: new Date().toISOString()
        });

        if (dbError) throw dbError;

        // Update status to success
        setParsedFiles(prev => prev.map((f, j) => 
          j === idx ? { ...f, status: 'success' } : f
        ));
        successCount++;

      } catch (error: any) {
        setParsedFiles(prev => prev.map((f, j) => 
          j === idx ? { ...f, status: 'error', error: error.message } : f
        ));
        errorCount++;
      }

      setUploadProgress(((i + 1) / matchedFiles.length) * 100);
    }

    setIsLoading(false);
    toast({
      title: "Bulk Upload Complete",
      description: `${successCount} files uploaded, ${errorCount} failed.`,
      variant: errorCount > 0 ? "destructive" : "default"
    });
  };

  const matchedCount = parsedFiles.filter(f => f.status === 'matched').length;
  const unmatchedCount = parsedFiles.filter(f => f.status === 'unmatched').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Delivery Upload
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Name files like <code className="bg-muted px-1 rounded">ClientName_Resume.docx</code> or <code className="bg-muted px-1 rounded">John Doe - Cover Letter.pdf</code>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          {isDragActive ? (
            <p>Drop files here...</p>
          ) : (
            <p className="text-muted-foreground">
              Drag & drop files here, or click to select
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            PDF, DOC, DOCX files supported
          </p>
        </div>

        {/* File List */}
        {parsedFiles.length > 0 && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="default" className="bg-green-500">
                {matchedCount} matched
              </Badge>
              <Badge variant="secondary">
                {unmatchedCount} unmatched
              </Badge>
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedFiles.map((pf, i) => (
                  <div 
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded text-sm
                      ${pf.status === 'matched' ? 'bg-green-50 dark:bg-green-950/20' : 
                        pf.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                        pf.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' :
                        pf.status === 'uploading' ? 'bg-blue-50 dark:bg-blue-950/20' :
                        'bg-muted/50'}`}
                  >
                    {pf.status === 'success' && <Check className="h-4 w-4 text-green-500" />}
                    {pf.status === 'error' && <X className="h-4 w-4 text-red-500" />}
                    {pf.status === 'uploading' && <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    {(pf.status === 'matched' || pf.status === 'unmatched' || pf.status === 'pending') && (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <span className="flex-1 truncate">{pf.file.name}</span>
                    
                    {pf.matchedClient && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="h-3 w-3" />
                        {pf.matchedClient.name}
                      </Badge>
                    )}
                    
                    {pf.status === 'unmatched' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <AlertCircle className="h-3 w-3" />
                        No match
                      </Badge>
                    )}

                    {pf.status !== 'success' && pf.status !== 'uploading' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Progress */}
            {isLoading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={uploadMatched}
                disabled={isLoading || matchedCount === 0}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload {matchedCount} Matched Files
              </Button>
              <Button 
                variant="outline"
                onClick={() => setParsedFiles([])}
                disabled={isLoading}
              >
                Clear All
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
