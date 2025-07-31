import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2, FileText } from "lucide-react";

interface ServiceType {
  id: string;
  name: string;
  description: string;
  default_timeline_days: number;
  gpt_form_prompt: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

interface TrainingMaterial {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
}

export function ServiceTypeAdmin() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<TrainingMaterial[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ServiceType>>({});

  useEffect(() => {
    fetchServiceTypes();
    fetchTrainingMaterials();
  }, []);

  const fetchServiceTypes = async () => {
    const { data, error } = await supabase
      .from("service_types")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load service types", variant: "destructive" });
    } else {
      setServiceTypes(data || []);
    }
  };

  const startEditing = async (serviceType: ServiceType) => {
    setIsEditing(serviceType.id);
    setEditForm({
      ...serviceType,
      tags: serviceType.tags || []
    });
    
    // Fetch assigned training materials for this service type
    const assignedMaterials = await fetchServiceTrainingMaterials(serviceType.id);
    setSelectedMaterials(assignedMaterials);
  };

  const fetchTrainingMaterials = async () => {
    const { data, error } = await supabase
      .from("training_materials")
      .select("id, name, description, type, is_active")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load training materials", variant: "destructive" });
    } else {
      setTrainingMaterials(data || []);
    }
  };

  const fetchServiceTrainingMaterials = async (serviceTypeId: string) => {
    const { data, error } = await supabase
      .from("service_training_materials")
      .select("training_material_id")
      .eq("service_type_id", serviceTypeId);

    if (error) {
      console.error("Error fetching service training materials:", error);
      return [];
    }
    
    return data?.map(item => item.training_material_id) || [];
  };

  const startCreating = () => {
    setIsCreating(true);
    setSelectedMaterials([]);
    setEditForm({
      name: "",
      description: "",
      default_timeline_days: 7,
      gpt_form_prompt: "",
      tags: [],
      is_active: true
    });
  };

  const duplicateService = async (serviceType: ServiceType) => {
    setIsCreating(true);
    setEditForm({
      ...serviceType,
      name: `${serviceType.name} (Copy)`,
      id: undefined
    });
    
    // Copy training materials assignment
    const assignedMaterials = await fetchServiceTrainingMaterials(serviceType.id);
    setSelectedMaterials(assignedMaterials);
  };

  const saveServiceType = async () => {
    if (!editForm.name || !editForm.description) {
      toast({ title: "Error", description: "Name and description are required", variant: "destructive" });
      return;
    }

    const serviceData = {
      name: editForm.name,
      description: editForm.description,
      default_timeline_days: editForm.default_timeline_days || 7,
      gpt_form_prompt: editForm.gpt_form_prompt,
      tags: editForm.tags || [],
      is_active: editForm.is_active !== false
    };

    let error;
    let serviceId = isEditing;
    
    if (isCreating) {
      const { data, error: insertError } = await supabase
        .from("service_types")
        .insert([serviceData])
        .select()
        .single();
      error = insertError;
      serviceId = data?.id;
    } else if (isEditing) {
      const { error: updateError } = await supabase
        .from("service_types")
        .update(serviceData)
        .eq("id", isEditing);
      error = updateError;
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save service type", variant: "destructive" });
      return;
    }

    // Save training materials assignments
    if (serviceId) {
      await saveTrainingMaterialAssignments(serviceId);
    }

    toast({ title: "Success", description: "Service type saved successfully" });
    setIsEditing(null);
    setIsCreating(false);
    setEditForm({});
    setSelectedMaterials([]);
    fetchServiceTypes();
  };

  const saveTrainingMaterialAssignments = async (serviceTypeId: string) => {
    // First, delete existing assignments
    await supabase
      .from("service_training_materials")
      .delete()
      .eq("service_type_id", serviceTypeId);

    // Then insert new assignments
    if (selectedMaterials.length > 0) {
      const assignments = selectedMaterials.map(materialId => ({
        service_type_id: serviceTypeId,
        training_material_id: materialId
      }));

      const { error } = await supabase
        .from("service_training_materials")
        .insert(assignments);

      if (error) {
        console.error("Error saving training material assignments:", error);
        toast({ title: "Warning", description: "Service saved but training materials assignment failed", variant: "destructive" });
      }
    }
  };

  const toggleActiveStatus = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("service_types")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Service type status updated" });
      fetchServiceTypes();
    }
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setEditForm({ ...editForm, tags });
  };

  const toggleMaterialSelection = (materialId: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Your Services & Products</h2>
        <Button onClick={startCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service Type
        </Button>
      </div>

      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? 'Create New Service Type' : 'Edit Service Type'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="timeline">Default Timeline (days) *</Label>
                <Input
                  id="timeline"
                  type="number"
                  value={editForm.default_timeline_days || 7}
                  onChange={(e) => setEditForm({ ...editForm, default_timeline_days: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="gpt_prompt">GPT Form Prompt</Label>
              <Textarea
                id="gpt_prompt"
                value={editForm.gpt_form_prompt || ""}
                onChange={(e) => setEditForm({ ...editForm, gpt_form_prompt: e.target.value })}
                placeholder="e.g., Ask 10 questions to build a comprehensive resume..."
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={editForm.tags?.join(', ') || ""}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="e.g., resume, basic, writing"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.is_active !== false}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
              <Label>Active Service</Label>
            </div>

            {/* Training Materials Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Training Materials Included</Label>
              <p className="text-sm text-muted-foreground">
                Select which training materials will be automatically available to clients who purchase this service.
              </p>
              
              {trainingMaterials.length > 0 ? (
                <ScrollArea className="h-48 w-full border rounded-md p-4">
                  <div className="space-y-3">
                    {trainingMaterials.map((material) => (
                      <div key={material.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`material-${material.id}`}
                          checked={selectedMaterials.includes(material.id)}
                          onCheckedChange={() => toggleMaterialSelection(material.id)}
                        />
                        <div className="flex items-start gap-2 flex-1">
                          <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="space-y-1 flex-1">
                            <Label 
                              htmlFor={`material-${material.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {material.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {material.description}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {material.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No training materials available</p>
                  <p className="text-xs">Upload training materials first to assign them to services</p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Selected: {selectedMaterials.length} of {trainingMaterials.length} materials
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveServiceType}>
                {isCreating ? 'Create' : 'Save Changes'}
              </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(null);
                    setIsCreating(false);
                    setEditForm({});
                    setSelectedMaterials([]);
                  }}
                >
                  Cancel
                </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {serviceTypes.map((serviceType) => (
            <Card key={serviceType.id} className={!serviceType.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{serviceType.name}</h3>
                      <Badge variant={serviceType.is_active ? 'default' : 'secondary'}>
                        {serviceType.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{serviceType.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium">Timeline</Label>
                    <p className="text-sm">{serviceType.default_timeline_days} days</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm">{new Date(serviceType.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {serviceType.tags && serviceType.tags.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {serviceType.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {serviceType.gpt_form_prompt && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium">GPT Prompt</Label>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {serviceType.gpt_form_prompt}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(serviceType)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateService(serviceType)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveStatus(serviceType.id, serviceType.is_active)}
                  >
                    {serviceType.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}