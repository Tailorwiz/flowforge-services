import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  AlertCircle 
} from "lucide-react";

interface TrainingMaterial {
  id: string;
  name: string;
  description: string;
  type: string;
  content_url: string;
  file_path: string;
  file_size: number;
  is_active: boolean;
  created_at: string;
}

export default function TrainingMaterialUpload() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "PDF Guide"
  });

  useEffect(() => {
    fetchTrainingMaterials();
  }, []);

  const fetchTrainingMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("training_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching training materials:', error);
      toast({
        title: "Error",
        description: "Failed to load training materials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF files only",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a name for the training material",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${formData.name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('training-materials')
        .getPublicUrl(filePath);

      // Create database record
      const { error: dbError } = await supabase
        .from('training_materials')
        .insert({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          content_url: publicUrl,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          is_active: true
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Training material uploaded successfully"
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        type: "PDF Guide"
      });

      // Reset file input
      if (event.target) {
        event.target.value = '';
      }

      // Refresh materials list
      fetchTrainingMaterials();

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload training material",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('training-materials')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('training_materials')
        .delete()
        .eq('id', materialId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Training material deleted successfully"
      });

      fetchTrainingMaterials();

    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete training material",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (materialId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('training_materials')
        .update({ is_active: !currentStatus })
        .eq('id', materialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Training material ${!currentStatus ? 'activated' : 'deactivated'}`
      });

      fetchTrainingMaterials();

    } catch (error) {
      console.error('Error updating material status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update material status",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading training materials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Training Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Material Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., The Science of Getting Job Interviews"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g., PDF Guide"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this material covers..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="file">PDF File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Only PDF files are accepted. Max size: 10MB
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Uploading...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Training Materials ({materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length > 0 ? (
            <div className="space-y-4">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{material.name}</h4>
                        <Badge variant={material.is_active ? "default" : "secondary"}>
                          {material.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {material.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {material.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Size: {formatFileSize(material.file_size)}</span>
                        <span>Uploaded: {new Date(material.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(material.content_url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(material.id, material.is_active)}
                    >
                      {material.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(material.id, material.file_path)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No training materials uploaded yet</p>
              <p className="text-sm">Upload your first PDF to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Upload your training PDF files here to make them available to clients</p>
          <p>• Only active materials will be visible to clients in their Training tab</p>
          <p>• Materials are only visible to clients with "active" status</p>
          <p>• Supported format: PDF files only (max 10MB)</p>
          <p>• You can deactivate materials temporarily without deleting them</p>
        </CardContent>
      </Card>
    </div>
  );
}