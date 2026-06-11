import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, FolderTree, Mail, Plug, Building2 } from "lucide-react";

interface Business {
  id: string;
  name: string;
  brand_color: string;
  from_name: string | null;
  reply_to_email: string | null;
  portal_url: string | null;
  welcome_email_subject: string | null;
  welcome_email_body: string | null;
  document_naming_pattern: string;
  drive_parent_folder_id: string | null;
  desktop_folder_path: string | null;
}

interface FolderTemplate {
  id?: string;
  folder_name: string;
  sort_order: number;
}

interface PlatformIntegration {
  id: string;
  platform_key: string;
  display_name: string;
  login_url: string | null;
  api_base_url: string | null;
  signup_path: string | null;
  is_enabled: boolean;
  notes: string | null;
}

export function OnboardingSettings() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [folders, setFolders] = useState<FolderTemplate[]>([]);
  const [platforms, setPlatforms] = useState<PlatformIntegration[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBusinesses();
    fetchPlatforms();
  }, []);

  useEffect(() => {
    const b = businesses.find((x) => x.id === selectedId) || null;
    setBusiness(b ? { ...b } : null);
    if (b) fetchFolders(b.id);
  }, [selectedId, businesses]);

  const fetchBusinesses = async () => {
    const { data } = await (supabase as any).from("businesses").select("*").order("name");
    setBusinesses(data || []);
    if (data?.length && !selectedId) setSelectedId(data[0].id);
  };

  const fetchFolders = async (businessId: string) => {
    const { data } = await (supabase as any)
      .from("business_folder_templates")
      .select("id, folder_name, sort_order")
      .eq("business_id", businessId)
      .order("sort_order");
    setFolders(data || []);
  };

  const fetchPlatforms = async () => {
    const { data } = await (supabase as any).from("platform_integrations").select("*").order("display_name");
    setPlatforms(data || []);
  };

  const saveBusiness = async () => {
    if (!business) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("businesses").update({
        from_name: business.from_name,
        reply_to_email: business.reply_to_email,
        portal_url: business.portal_url,
        welcome_email_subject: business.welcome_email_subject,
        welcome_email_body: business.welcome_email_body,
        document_naming_pattern: business.document_naming_pattern,
        drive_parent_folder_id: business.drive_parent_folder_id,
        desktop_folder_path: business.desktop_folder_path,
        brand_color: business.brand_color,
      }).eq("id", business.id);
      if (error) throw error;

      // Replace the folder template set with the edited list
      const { error: delErr } = await (supabase as any)
        .from("business_folder_templates").delete().eq("business_id", business.id);
      if (delErr) throw delErr;
      const rows = folders
        .filter((f) => f.folder_name.trim())
        .map((f, i) => ({ business_id: business.id, folder_name: f.folder_name.trim(), sort_order: i + 1 }));
      if (rows.length) {
        const { error: insErr } = await (supabase as any).from("business_folder_templates").insert(rows);
        if (insErr) throw insErr;
      }

      toast({ title: "Saved", description: `${business.name} settings updated` });
      fetchBusinesses();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const savePlatform = async (p: PlatformIntegration) => {
    const { error } = await (supabase as any).from("platform_integrations").update({
      login_url: p.login_url,
      api_base_url: p.api_base_url,
      signup_path: p.signup_path,
      is_enabled: p.is_enabled,
    }).eq("id", p.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `${p.display_name} integration updated` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Business settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Business Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Label>Business</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {business && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email "From" name</Label>
                  <Input value={business.from_name || ""} onChange={(e) => setBusiness({ ...business, from_name: e.target.value })} />
                </div>
                <div>
                  <Label>Reply-to email</Label>
                  <Input value={business.reply_to_email || ""} onChange={(e) => setBusiness({ ...business, reply_to_email: e.target.value })} />
                </div>
                <div>
                  <Label>Client portal URL (shown in welcome email/PDF)</Label>
                  <Input value={business.portal_url || ""} placeholder="https://..." onChange={(e) => setBusiness({ ...business, portal_url: e.target.value })} />
                </div>
                <div>
                  <Label>Brand color</Label>
                  <Input type="color" value={business.brand_color} onChange={(e) => setBusiness({ ...business, brand_color: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2"><FolderTree className="w-4 h-4" /> Folders & File Naming</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Google Drive parent folder ID (cloud)</Label>
                    <Input value={business.drive_parent_folder_id || ""} placeholder="e.g. 1AbC...xyz from the folder URL"
                      onChange={(e) => setBusiness({ ...business, drive_parent_folder_id: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Client folders are created inside this Drive folder. Share it with your service account email.</p>
                  </div>
                  <div>
                    <Label>Desktop folder location</Label>
                    <Input value={business.desktop_folder_path || ""} placeholder="C:\Users\Marcus\Desktop\Clients\EJOD"
                      onChange={(e) => setBusiness({ ...business, desktop_folder_path: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Point Google Drive for Desktop at the parent folder so client folders appear here automatically.</p>
                  </div>
                </div>
                <div>
                  <Label>Document naming pattern</Label>
                  <Input value={business.document_naming_pattern} onChange={(e) => setBusiness({ ...business, document_naming_pattern: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Placeholders: {"{client_name}"}, {"{document_label}"}, {"{date}"}, {"{business}"}
                  </p>
                </div>
                <div>
                  <Label>Subfolders created for each client</Label>
                  <div className="space-y-2 mt-1">
                    {folders.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={f.folder_name} onChange={(e) => {
                          const next = [...folders];
                          next[i] = { ...f, folder_name: e.target.value };
                          setFolders(next);
                        }} />
                        <Button variant="ghost" size="sm" onClick={() => setFolders(folders.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setFolders([...folders, { folder_name: "", sort_order: folders.length + 1 }])}>
                      <Plus className="w-4 h-4 mr-1" /> Add subfolder
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2"><Mail className="w-4 h-4" /> Welcome Email Template</h4>
                <div>
                  <Label>Subject</Label>
                  <Input value={business.welcome_email_subject || ""} onChange={(e) => setBusiness({ ...business, welcome_email_subject: e.target.value })} />
                </div>
                <div>
                  <Label>Body (HTML)</Label>
                  <Textarea rows={10} value={business.welcome_email_body || ""} onChange={(e) => setBusiness({ ...business, welcome_email_body: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Placeholders: {"{{client_name}}"}, {"{{business_name}}"}, {"{{service_name}}"}, {"{{delivery_date}}"}, {"{{portal_url}}"}, {"{{accounts_table}}"}
                  </p>
                </div>
              </div>

              <Button onClick={saveBusiness} disabled={saving} className="bg-rdr-navy hover:bg-rdr-navy/90">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Business Settings"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Account Platforms (TailorWiz, JobIntel 360, Jobs On Demand Academy)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {platforms.map((p, i) => (
            <div key={p.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{p.display_name}</h4>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Auto-create accounts</Label>
                  <Switch checked={p.is_enabled} onCheckedChange={(v) => {
                    const next = [...platforms];
                    next[i] = { ...p, is_enabled: v };
                    setPlatforms(next);
                  }} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Login URL (sent to clients)</Label>
                  <Input value={p.login_url || ""} placeholder="https://app.example.com/login" onChange={(e) => {
                    const next = [...platforms];
                    next[i] = { ...p, login_url: e.target.value };
                    setPlatforms(next);
                  }} />
                </div>
                <div>
                  <Label className="text-xs">API base URL</Label>
                  <Input value={p.api_base_url || ""} placeholder="https://api.example.com" onChange={(e) => {
                    const next = [...platforms];
                    next[i] = { ...p, api_base_url: e.target.value };
                    setPlatforms(next);
                  }} />
                </div>
                <div>
                  <Label className="text-xs">Signup endpoint path</Label>
                  <Input value={p.signup_path || ""} placeholder="/api/accounts" onChange={(e) => {
                    const next = [...platforms];
                    next[i] = { ...p, signup_path: e.target.value };
                    setPlatforms(next);
                  }} />
                </div>
              </div>
              {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
              <Button size="sm" variant="outline" onClick={() => savePlatform(platforms[i])}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
