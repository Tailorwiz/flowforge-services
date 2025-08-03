import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { 
  Upload, 
  FileText, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react';

interface ResumeUploadProps {
  clientId: string;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ResumeUpload({ clientId, onUploadComplete, onClose }: ResumeUploadProps) {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user?.id || !clientId) {
      toast({
        title: "Error",
        description: "User not authenticated or client ID missing",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files one by one
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileRecord = newFiles[i];
      
      try {
        await uploadFile(file, fileRecord.id);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileRecord.id 
              ? { ...f, status: 'error', errorMessage: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);
  }, [user?.id, clientId]);

  const uploadFile = async (file: File, fileId: string) => {
    const abortController = new AbortController();
    abortControllers.current.set(fileId, abortController);

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Save to database using the document_uploads table
      const { data: dbData, error: dbError } = await (supabase as any).rpc('create_document_upload', {
        p_client_id: clientId,
        p_intake_form_id: null,
        p_file_name: file.name,
        p_file_path: filePath,
        p_file_size: file.size,
        p_mime_type: file.type,
        p_bucket_name: 'resumes',
        p_upload_type: 'resume',
        p_document_category: getDocumentCategory(file.type)
      });

      if (dbError) throw dbError;

      // Update file record with success
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'completed', uploadProgress: 100, url: publicUrl }
            : f
        )
      );

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Upload was cancelled
      }
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error', errorMessage: error.message }
            : f
        )
      );

      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      abortControllers.current.delete(fileId);
    }
  };

  const getDocumentCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    return 'other';
  };

  const removeFile = (fileId: string) => {
    // Cancel upload if in progress
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }

    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleComplete = () => {
    const completedUploads = uploadedFiles.filter(f => f.status === 'completed');
    if (completedUploads.length === 0) {
      toast({
        title: "No Files Uploaded",
        description: "Please upload at least one file before continuing.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Upload Complete!",
      description: `Successfully uploaded ${completedUploads.length} file(s).`,
    });

    onUploadComplete?.();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upload Your Documents</span>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload your resume, CV, or supporting documents. Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, WEBP (max 10MB each)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG, GIF, WEBP up to 10MB each
                </p>
              </div>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Uploaded Files</h4>
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        {file.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {file.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        {file.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'error' && (
                        <span className="text-red-500">{file.errorMessage}</span>
                      )}
                      {file.url && file.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    {file.status === 'uploading' && (
                      <Progress value={file.uploadProgress} className="h-1 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handleComplete}
              disabled={isUploading || uploadedFiles.filter(f => f.status === 'completed').length === 0}
              className="flex-1"
            >
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Upload
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}