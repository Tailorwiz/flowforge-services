import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Upload, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Delivery {
  id: string;
  document_type: string;
  document_title: string;
  file_url: string;
  file_path: string;
  file_size: number;
  status: string;
  delivered_at: string;
  approved_at?: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  mime_type: string | null;
  project_id: string | null;
}

interface RevisionRequestModalProps {
  delivery: Delivery;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const REVISION_REASONS = [
  { id: 'update_info', label: 'I need to update/add some information' },
  { id: 'incorrect', label: 'Something looks incorrect' },
  { id: 'tone_format', label: 'I want to change the tone or format' },
  { id: 'target_role', label: "This doesn't match my target role" },
  { id: 'other', label: 'Other (write below)' }
];

export function RevisionRequestModal({ delivery, open, onOpenChange, onSuccess }: RevisionRequestModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReasonChange = (reasonId: string, checked: boolean) => {
    if (checked) {
      setSelectedReasons(prev => [...prev, reasonId]);
    } else {
      setSelectedReasons(prev => prev.filter(id => id !== reasonId));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => 
        file.size <= 10 * 1024 * 1024 // 10MB limit
      );
      
      if (validFiles.length !== files.length) {
        toast({
          title: "File Size Warning",
          description: "Some files were too large (10MB limit) and were not added.",
          variant: "destructive",
        });
      }
      
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `revision-${delivery.id}-${Date.now()}.${fileExt}`;
        const filePath = `intake-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('intake-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('intake-attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0 || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select at least one reason and provide a description.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Upload files first
      const attachmentUrls = await uploadFiles();

      // Create revision request
      const { error } = await supabase
        .from('revision_requests')
        .insert({
          delivery_id: delivery.id,
          client_id: delivery.client_id,
          reasons: selectedReasons,
          custom_reason: selectedReasons.includes('other') ? customReason : null,
          description: description,
          attachment_urls: attachmentUrls,
          status: 'pending'
        });

      if (error) throw error;

      // Update delivery status
      await supabase
        .from('deliveries')
        .update({ 
          status: 'revision_requested',
          updated_at: new Date().toISOString()
        })
        .eq('id', delivery.id);

      // TODO: Trigger notification to admin

      onSuccess();
    } catch (error) {
      console.error('Error submitting revision request:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit your revision request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Revisions for {delivery.document_title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Revision Reasons */}
          <div>
            <Label className="text-base font-medium">What would you like changed?</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select all that apply:
            </p>
            <div className="space-y-3">
              {REVISION_REASONS.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={reason.id}
                    checked={selectedReasons.includes(reason.id)}
                    onCheckedChange={(checked) => 
                      handleReasonChange(reason.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={reason.id} className="text-sm">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Custom reason text field */}
            {selectedReasons.includes('other') && (
              <div className="mt-3">
                <Label htmlFor="custom-reason" className="text-sm">
                  Please specify:
                </Label>
                <Input
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="What specific changes do you need?"
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-base font-medium">
              What would you like changed?
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Please provide specific details about the changes you'd like:
            </p>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Be as specific as possible about what you'd like changed, added, or removed..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-base font-medium">
              Attach Updated Info or Documents (Optional)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload any updated resume, job description, or other documents that might help.
            </p>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:text-primary/80">
                    Click to upload files
                  </span>
                  <span className="text-sm text-muted-foreground"> or drag and drop</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX up to 10MB each
                </p>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(file.size / 1024)}KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || uploading || selectedReasons.length === 0 || !description.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {submitting ? 'Submitting...' : 'Submit Revision Request'}
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong> We'll review your feedback and typically provide 
              updates within 2-3 business days. You'll receive an email notification when your 
              revised documents are ready.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}