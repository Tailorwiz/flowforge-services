import { useState } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GeneralDocumentUploadProps {
  clientId?: string;
  intakeFormId?: string;
  documentType?: string;
  bucketName?: string;
  onUploadComplete?: (uploadedFiles: any[]) => void;
}

const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'template', label: 'Template' },
  { value: 'intake_attachment', label: 'Intake Attachment' },
  { value: 'other', label: 'Other' }
];

const BUCKET_OPTIONS = [
  { value: 'client-documents', label: 'Client Documents' },
  { value: 'admin-documents', label: 'Admin Documents' },
  { value: 'document-templates', label: 'Document Templates' },
  { value: 'intake-attachments', label: 'Intake Attachments' }
];

export function GeneralDocumentUpload({
  clientId,
  intakeFormId,
  documentType = 'other',
  bucketName = 'client-documents',
  onUploadComplete
}: GeneralDocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocumentType, setSelectedDocumentType] = useState(documentType);
  const [selectedBucket, setSelectedBucket] = useState(bucketName);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Create folder structure based on client or general structure
        let filePath = fileName;
        if (clientId && (selectedBucket === 'client-documents' || selectedBucket === 'intake-attachments')) {
          filePath = `${clientId}/${fileName}`;
        } else if (selectedBucket === 'admin-documents') {
          filePath = `admin/${fileName}`;
        } else if (selectedBucket === 'document-templates') {
          filePath = `templates/${fileName}`;
        }

        // Upload to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from(selectedBucket)
          .upload(filePath, file);

        if (storageError) {
          console.error('Storage upload error:', storageError);
          throw new Error(`Failed to upload ${file.name}: ${storageError.message}`);
        }

        // Create database record - using raw SQL since table might not be in types yet
        const uploadRecord = {
          client_id: clientId || null,
          intake_form_id: intakeFormId || null,
          file_name: fileName,
          original_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          bucket_name: selectedBucket,
          document_type: selectedDocumentType,
          metadata: {
            uploaded_at: new Date().toISOString(),
            file_extension: fileExt
          }
        };

        // Using RPC call to insert since table might not be in types
        const { data: dbData, error: dbError } = await supabase.rpc('create_document_upload', {
          p_client_id: clientId || null,
          p_intake_form_id: intakeFormId || null,
          p_file_name: fileName,
          p_original_name: file.name,
          p_file_path: filePath,
          p_file_size: file.size,
          p_mime_type: file.type || 'application/octet-stream',
          p_bucket_name: selectedBucket,
          p_document_type: selectedDocumentType,
          p_metadata: uploadRecord.metadata
        });

        if (dbError) {
          console.error('Database insert error:', dbError);
          // Try direct insert as fallback
          try {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('document_uploads' as any)
              .insert(uploadRecord)
              .select()
              .single();
            
            if (fallbackError) {
              await supabase.storage.from(selectedBucket).remove([filePath]);
              throw new Error(`Failed to save ${file.name} record: ${fallbackError.message}`);
            }
            uploadedFiles.push(fallbackData);
          } catch (fallbackErr) {
            await supabase.storage.from(selectedBucket).remove([filePath]);
            throw new Error(`Failed to save ${file.name} record`);
          }
        } else {
          uploadedFiles.push(dbData);
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} file(s)`,
      });

      onUploadComplete?.(uploadedFiles);
      setFiles([]);
      setUploadProgress(0);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Document Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="document-type">Document Type</Label>
        <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bucket Selection */}
      <div className="space-y-2">
        <Label htmlFor="bucket">Storage Location</Label>
        <Select value={selectedBucket} onValueChange={setSelectedBucket}>
          <SelectTrigger>
            <SelectValue placeholder="Select storage location" />
          </SelectTrigger>
          <SelectContent>
            {BUCKET_OPTIONS.map((bucket) => (
              <SelectItem key={bucket.value} value={bucket.value}>
                {bucket.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File Selection */}
      <div className="space-y-2">
        <Label htmlFor="file-upload">Select Files</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <Input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              Click to select files or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, Word, Text, or Image files
            </p>
          </label>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files ({files.length})</Label>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <Label>Upload Progress</Label>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-gray-600 text-center">
            {Math.round(uploadProgress)}% Complete
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          onClick={uploadFiles}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Upload {files.length} File{files.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}