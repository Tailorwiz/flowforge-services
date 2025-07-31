import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  AlertCircle,
  Edit,
  Users,
  Image as ImageIcon
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
  thumbnail_url?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
}

const FILE_TYPES = [
  'PDF',
  'MS Word/Docx',
  'Video',
  'Audio',
  'PowerPoint',
  'Excel',
  'Image',
  'Other'
];

const ACCEPTED_FILE_TYPES = {
  'PDF': '.pdf',
  'MS Word/Docx': '.doc,.docx',
  'Video': '.mp4,.mov,.avi,.wmv',
  'Audio': '.mp3,.wav,.m4a',
  'PowerPoint': '.ppt,.pptx',
  'Excel': '.xls,.xlsx',
  'Image': '.jpg,.jpeg,.png,.gif',
  'Other': '*'
};

export default function TrainingMaterialUpload() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null);
  const [showAccessDialog, setShowAccessDialog] = useState<TrainingMaterial | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "PDF"
  });

  useEffect(() => {
    fetchTrainingMaterials();
    fetchClients();
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

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, status")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, thumbnailFile?: File) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop();
        const thumbFileName = `thumb_${Date.now()}_${formData.name.replace(/[^a-zA-Z0-9]/g, '_')}.${thumbExt}`;
        
        const { error: thumbUploadError } = await supabase.storage
          .from('training-thumbnails')
          .upload(thumbFileName, thumbnailFile);

        if (!thumbUploadError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('training-thumbnails')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbPublicUrl;
        }
      }

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
          thumbnail_url: thumbnailUrl,
          is_active: true
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Training material uploaded successfully"
      });

      // Reset form and hide it
      setFormData({
        name: "",
        description: "",
        type: "PDF"
      });
      setShowUploadForm(false);

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

  const handleEdit = async (materialId: string, updatedData: Partial<TrainingMaterial>, newThumbnail?: File, newFile?: File) => {
    try {
      let thumbnailUrl = updatedData.thumbnail_url;
      let contentUrl = updatedData.content_url;
      let filePath = updatedData.file_path;
      let fileSize = updatedData.file_size;

      const material = materials.find(m => m.id === materialId);

      // Handle new file upload if provided
      if (newFile) {
        // Delete old file if it exists
        if (material?.file_path) {
          await supabase.storage
            .from('training-materials')
            .remove([material.file_path]);
        }

        // Upload new file
        const fileExt = newFile.name.split('.').pop();
        const fileName = `${Date.now()}_${updatedData.name?.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
        
        const { error: fileUploadError } = await supabase.storage
          .from('training-materials')
          .upload(fileName, newFile);

        if (!fileUploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('training-materials')
            .getPublicUrl(fileName);
          contentUrl = publicUrl;
          filePath = fileName;
          fileSize = newFile.size;
        }
      }

      // Handle thumbnail upload if a new one is provided
      if (newThumbnail) {
        const thumbExt = newThumbnail.name.split('.').pop();
        const thumbFileName = `thumb_${Date.now()}_${updatedData.name?.replace(/[^a-zA-Z0-9]/g, '_')}.${thumbExt}`;
        
        // Delete old thumbnail if it exists
        if (material?.thumbnail_url) {
          const oldThumbPath = material.thumbnail_url.split('/').pop();
          if (oldThumbPath) {
            await supabase.storage
              .from('training-thumbnails')
              .remove([oldThumbPath]);
          }
        }

        // Upload new thumbnail
        const { error: thumbUploadError } = await supabase.storage
          .from('training-thumbnails')
          .upload(thumbFileName, newThumbnail);

        if (!thumbUploadError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('training-thumbnails')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbPublicUrl;
        }
      }

      const { error } = await supabase
        .from('training_materials')
        .update({ 
          ...updatedData, 
          thumbnail_url: thumbnailUrl,
          content_url: contentUrl,
          file_path: filePath,
          file_size: fileSize
        })
        .eq('id', materialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training material updated successfully"
      });

      setEditingMaterial(null);
      fetchTrainingMaterials();

    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update training material",
        variant: "destructive"
      });
    }
  };

  const grantClientAccess = async (clientId: string, materialId: string) => {
    try {
      const { error } = await supabase
        .from('client_training_access')
        .insert({
          client_id: clientId,
          training_material_id: materialId,
          access_type: 'manual'
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        throw error;
      }

      toast({
        title: "Success",
        description: "Access granted to client"
      });

    } catch (error) {
      console.error('Error granting access:', error);
      toast({
        title: "Error",
        description: "Failed to grant access",
        variant: "destructive"
      });
    }
  };

  const revokeClientAccess = async (clientId: string, materialId: string) => {
    try {
      const { error } = await supabase
        .from('client_training_access')
        .delete()
        .eq('client_id', clientId)
        .eq('training_material_id', materialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Access revoked from client"
      });

    } catch (error) {
      console.error('Error revoking access:', error);
      toast({
        title: "Error",
        description: "Failed to revoke access",
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
      {/* Upload Form Toggle */}
      {!showUploadForm ? (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={() => setShowUploadForm(true)}
              className="w-full"
            >
              <Upload className="w-5 h-5 mr-2" />
              Add New Training Material
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select file type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Label htmlFor="file">Training File</Label>
              <Input
                id="file"
                type="file"
                accept={ACCEPTED_FILE_TYPES[formData.type as keyof typeof ACCEPTED_FILE_TYPES] || '*'}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Accepted formats: {ACCEPTED_FILE_TYPES[formData.type as keyof typeof ACCEPTED_FILE_TYPES] || 'All files'}. Max size: 50MB
              </p>
            </div>

            <div>
              <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
              <Input
                id="thumbnail"
                type="file"
                accept=".jpg,.jpeg,.png,.gif"
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload a thumbnail image for better visual representation
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Uploading...
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadForm(false);
                  setFormData({ name: "", description: "", type: "PDF" });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <div className="flex items-start gap-4">
                    <div className="w-64 h-80 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                      {material.thumbnail_url ? (
                        <img 
                          src={material.thumbnail_url} 
                          alt={material.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <FileText className="w-12 h-12 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
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
                      onClick={() => setEditingMaterial(material)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAccessDialog(material)}
                    >
                      <Users className="w-4 h-4" />
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
          <p>• Upload your training files here to make them available to clients</p>
          <p>• Only active materials will be visible to clients in their Training tab</p>
          <p>• Use the access control to grant specific clients access to materials</p>
          <p>• Supported formats: PDF, Word, Video, Audio, PowerPoint, Excel, Images (max 50MB)</p>
          <p>• Upload thumbnail images for better visual representation</p>
          <p>• You can edit, deactivate, or delete materials as needed</p>
        </CardContent>
      </Card>

      {/* Edit Material Dialog */}
      <Dialog open={editingMaterial !== null} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Training Material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-6 pb-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingMaterial.name}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingMaterial.description}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                    className="min-h-[200px] resize-y"
                    placeholder="Enter a detailed description of this training material..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editingMaterial.type}
                    onValueChange={(value) => setEditingMaterial({ ...editingMaterial, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {FILE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Current Thumbnail Preview */}
                {editingMaterial.thumbnail_url && (
                  <div>
                    <Label>Current Thumbnail</Label>
                    <div className="w-64 h-80 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden mt-2 shadow-md mx-auto">
                      <img 
                        src={editingMaterial.thumbnail_url} 
                        alt="Current thumbnail"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
                
                {/* New Thumbnail Upload */}
                <div>
                  <Label htmlFor="edit-thumbnail">Update Thumbnail (Optional)</Label>
                  <Input
                    id="edit-thumbnail"
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a new thumbnail image to replace the current one
                  </p>
                </div>

                {/* Replace Training Material File */}
                <div>
                  <Label htmlFor="edit-file">Replace Training Material File (Optional)</Label>
                  <Input
                    id="edit-file"
                    type="file"
                    accept={ACCEPTED_FILE_TYPES[editingMaterial.type as keyof typeof ACCEPTED_FILE_TYPES] || '*'}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a new file to replace the current training material. 
                    Accepted: {ACCEPTED_FILE_TYPES[editingMaterial.type as keyof typeof ACCEPTED_FILE_TYPES] || 'All files'}
                  </p>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t bg-background sticky bottom-0">
                  <Button variant="outline" onClick={() => setEditingMaterial(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    const thumbnailInput = document.getElementById('edit-thumbnail') as HTMLInputElement;
                    const fileInput = document.getElementById('edit-file') as HTMLInputElement;
                    const newThumbnail = thumbnailInput?.files?.[0];
                    const newFile = fileInput?.files?.[0];
                    
                    handleEdit(editingMaterial.id, {
                      name: editingMaterial.name,
                      description: editingMaterial.description,
                      type: editingMaterial.type
                    }, newThumbnail, newFile);
                  }}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Access Control Dialog */}
      <Dialog open={showAccessDialog !== null} onOpenChange={() => setShowAccessDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Client Access - {showAccessDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Grant or revoke access to this training material for specific clients.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => grantClientAccess(client.id, showAccessDialog!.id)}
                    >
                      Grant Access
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeClientAccess(client.id, showAccessDialog!.id)}
                    >
                      Revoke Access
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowAccessDialog(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}