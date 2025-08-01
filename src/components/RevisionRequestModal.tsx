import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface Delivery {
  id: string;
  document_type: string;
  document_title: string;
  client_id: string;
}

interface RevisionRequestModalProps {
  delivery: Delivery;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const REVISION_REASONS = [
  "I need to update/add some information",
  "Something looks incorrect", 
  "I want to change the tone or format",
  "This doesn't match my target role",
  "Other (specify below)"
];

export function RevisionRequestModal({
  delivery,
  open,
  onOpenChange,
  onSuccess
}: RevisionRequestModalProps) {
  const { user } = useAuth();
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setSelectedReasons([...selectedReasons, reason]);
    } else {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
      if (reason === "Other (specify below)") {
        setCustomReason("");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];

    const uploadPromises = attachments.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${delivery.id}-${Date.now()}.${fileExt}`;
      const filePath = `revision-attachments/${fileName}`;

      const { error } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      toast({
        title: "Please select at least one reason",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Please describe what you'd like changed",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        attachmentUrls = await uploadAttachments();
        setUploading(false);
      }

      // Create revision request
      const { error } = await supabase
        .from('revision_requests')
        .insert({
          delivery_id: delivery.id,
          client_id: delivery.client_id,
          reasons: selectedReasons,
          custom_reason: selectedReasons.includes("Other (specify below)") ? customReason : null,
          description: description.trim(),
          attachment_urls: attachmentUrls
        });

      if (error) throw error;

      // Update delivery status
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({ status: 'revision_requested' })
        .eq('id', delivery.id);

      if (updateError) throw updateError;

      toast({
        title: "Revision Request Submitted",
        description: "We'll review your feedback and provide an updated version within 3-5 business days.",
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting revision request:', error);
      toast({
        title: "Error",
        description: "Failed to submit revision request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedReasons([]);
    setCustomReason("");
    setDescription("");
    setAttachments([]);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Revisions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Document: <span className="font-medium">{delivery.document_title}</span>
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              What would you like us to change? (Select all that apply)
            </Label>
            {REVISION_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <Checkbox
                  id={reason}
                  checked={selectedReasons.includes(reason)}
                  onCheckedChange={(checked) => 
                    handleReasonChange(reason, checked as boolean)
                  }
                />
                <Label htmlFor={reason} className="text-sm">
                  {reason}
                </Label>
              </div>
            ))}
          </div>

          {/* Custom Reason */}
          {selectedReasons.includes("Other (specify below)") && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Please specify:</Label>
              <Input
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the specific issue..."
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-medium">
              What would you like changed? *
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details about what you'd like us to revise..."
              rows={4}
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Attach any updated info or documents (optional)
            </Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <div className="text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Click to upload or drag and drop
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </div>
            </div>

            {/* Show attached files */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attached files:</Label>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitting || uploading}
            >
              {uploading ? "Uploading..." : submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}