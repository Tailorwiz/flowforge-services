import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Building2, User, FileText, Rocket, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, FolderTree, Mail, KeyRound, ExternalLink, Trash2, Upload
} from "lucide-react";
import { format } from "date-fns";

interface Business {
  id: string;
  slug: string;
  name: string;
  brand_color: string;
  document_naming_pattern: string;
  desktop_folder_path: string | null;
  drive_parent_folder_id: string | null;
}

interface FolderTemplate {
  id: string;
  folder_name: string;
  sort_order: number;
}

interface ServiceType {
  id: string;
  name: string;
  default_timeline_days: number;
}

interface WizardDocument {
  file: File;
  label: string;
  targetFolder: string;
}

type StepStatus = "pending" | "running" | "done" | "warning" | "failed";

interface LaunchStep {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

interface LaunchResults {
  clientId?: string;
  driveFolderUrl?: string;
  desktopPath?: string;
  accounts?: Record<string, { status: string; error?: string }>;
  emailSubject?: string;
  emailSentAt?: string;
}

const STEPS = ["Business", "Client Details", "Documents", "Review & Launch"];

export function OnboardingWizard({ onCompleted }: { onCompleted?: () => void }) {
  const [step, setStep] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [folderTemplates, setFolderTemplates] = useState<FolderTemplate[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [client, setClient] = useState({ name: "", email: "", phone: "", service_type_id: "" });
  const [documents, setDocuments] = useState<WizardDocument[]>([]);
  const [launching, setLaunching] = useState(false);
  const [launchSteps, setLaunchSteps] = useState<LaunchStep[]>([]);
  const [results, setResults] = useState<LaunchResults>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchBusinesses();
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (selectedBusiness) fetchFolderTemplates(selectedBusiness.id);
  }, [selectedBusiness?.id]);

  const fetchBusinesses = async () => {
    const { data, error } = await (supabase as any)
      .from("businesses")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) {
      toast({ title: "Error", description: "Failed to load businesses. Has the onboarding migration been applied?", variant: "destructive" });
    } else {
      setBusinesses(data || []);
    }
  };

  const fetchServiceTypes = async () => {
    const { data } = await supabase
      .from("service_types")
      .select("id, name, default_timeline_days")
      .eq("is_active", true)
      .order("name");
    setServiceTypes(data || []);
  };

  const fetchFolderTemplates = async (businessId: string) => {
    const { data } = await (supabase as any)
      .from("business_folder_templates")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order");
    setFolderTemplates(data || []);
  };

  const generateFileName = (label: string, originalName: string) => {
    if (!selectedBusiness) return originalName;
    const ext = originalName.includes(".") ? originalName.substring(originalName.lastIndexOf(".")) : "";
    return selectedBusiness.document_naming_pattern
      .split("{client_name}").join(client.name || "Client")
      .split("{document_label}").join(label || "Document")
      .split("{date}").join(format(new Date(), "yyyy-MM-dd"))
      .split("{business}").join(selectedBusiness.name) + ext;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const defaults = folderTemplates[0]?.folder_name || "";
    const newDocs: WizardDocument[] = Array.from(files).map((file) => ({
      file,
      label: file.name.replace(/\.[^.]+$/, ""),
      targetFolder: defaults,
    }));
    setDocuments((prev) => [...prev, ...newDocs]);
  };

  const canContinue = useMemo(() => {
    if (step === 0) return !!selectedBusiness;
    if (step === 1) return !!(client.name && client.email && client.service_type_id);
    return true;
  }, [step, selectedBusiness, client]);

  const updateStep = (key: string, status: StepStatus, detail?: string) => {
    setLaunchSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status, detail } : s)));
  };

  const launch = async () => {
    if (!selectedBusiness) return;
    setLaunching(true);
    setFinished(false);
    const steps: LaunchStep[] = [
      { key: "client", label: "Create client record", status: "pending" },
      { key: "docs", label: `Save ${documents.length} document(s) with your naming convention`, status: "pending" },
      { key: "folders", label: "Create cloud + desktop folders and file documents", status: "pending" },
      { key: "accounts", label: "Create TailorWiz, JobIntel 360, Jobs On Demand Academy & portal accounts", status: "pending" },
      { key: "email", label: "Send welcome email with login PDF attached", status: "pending" },
    ];
    setLaunchSteps(steps);
    const launchResults: LaunchResults = {};

    try {
      // 1. Client record
      updateStep("client", "running");
      const serviceType = serviceTypes.find((s) => s.id === client.service_type_id);
      const delivery = new Date();
      delivery.setDate(delivery.getDate() + (serviceType?.default_timeline_days || 7));
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert([{
          name: client.name.trim(),
          email: client.email.trim().toLowerCase(),
          phone: client.phone || null,
          service_type_id: client.service_type_id,
          business_id: selectedBusiness.id,
          estimated_delivery_date: delivery.toISOString().split("T")[0],
          payment_status: "pending",
        } as any])
        .select()
        .single();
      if (clientErr || !newClient) throw new Error(`Could not create client: ${clientErr?.message}`);
      launchResults.clientId = newClient.id;

      await (supabase as any).from("onboarding_records").insert({
        client_id: newClient.id,
        business_id: selectedBusiness.id,
        status: "in_progress",
      });
      await (supabase as any).from("onboarding_events").insert({
        client_id: newClient.id,
        business_id: selectedBusiness.id,
        event_type: "signup",
        title: `${client.name} signed up with ${selectedBusiness.name}`,
        detail: { service: serviceType?.name, email: client.email },
      });
      updateStep("client", "done");

      // 2. Upload documents with the generated names
      updateStep("docs", "running");
      for (const doc of documents) {
        const finalName = generateFileName(doc.label, doc.file.name);
        const path = `onboarding/${newClient.id}/${finalName}`;
        const { error: upErr } = await supabase.storage
          .from("client-documents")
          .upload(path, doc.file, { upsert: true });
        if (upErr) throw new Error(`Upload failed for ${finalName}: ${upErr.message}`);

        await supabase.from("document_uploads").insert({
          client_id: newClient.id,
          bucket_name: "client-documents",
          file_path: path,
          file_name: finalName,
          original_name: finalName,
          document_type: doc.targetFolder || "onboarding",
          mime_type: doc.file.type || "application/octet-stream",
          file_size: doc.file.size,
          metadata: { onboarding: "true", target_folder: doc.targetFolder, label: doc.label } as any,
        });
      }
      updateStep("docs", "done", documents.length ? undefined : "No documents uploaded");

      // 3. Folders (cloud + desktop path)
      updateStep("folders", "running");
      const { data: folderRes, error: folderErr } = await supabase.functions.invoke("create-client-folders", {
        body: { clientId: newClient.id },
      });
      if (folderErr || folderRes?.success === false) {
        updateStep("folders", "failed", folderErr?.message || folderRes?.error);
      } else if (!folderRes?.driveConfigured) {
        updateStep("folders", "warning", "Google Drive isn't connected yet — see Onboarding Settings to finish setup.");
      } else {
        launchResults.driveFolderUrl = folderRes.driveFolderUrl;
        launchResults.desktopPath = folderRes.desktopPath;
        updateStep("folders", "done");
      }

      // 4. Platform accounts
      updateStep("accounts", "running");
      const { data: acctRes, error: acctErr } = await supabase.functions.invoke("provision-platform-accounts", {
        body: { clientId: newClient.id },
      });
      if (acctErr || acctRes?.success === false) {
        updateStep("accounts", "failed", acctErr?.message || acctRes?.error);
      } else {
        launchResults.accounts = acctRes.results;
        const needsAttention = Object.values(acctRes.results || {}).some((r: any) => r.status !== "created");
        updateStep("accounts", needsAttention ? "warning" : "done",
          needsAttention ? "Some accounts need manual setup — details below." : undefined);
      }

      // 5. Welcome email + PDF
      updateStep("email", "running");
      const { data: emailRes, error: emailErr } = await supabase.functions.invoke("send-welcome-packet", {
        body: { clientId: newClient.id },
      });
      if (emailErr || emailRes?.success === false) {
        updateStep("email", "failed", emailErr?.message || emailRes?.error);
      } else {
        launchResults.emailSubject = emailRes.subject;
        launchResults.emailSentAt = emailRes.sentAt;
        updateStep("email", "done");
      }

      setResults(launchResults);
      setFinished(true);
      toast({ title: "Onboarding complete", description: `${client.name} has been onboarded with ${selectedBusiness.name}.` });
      onCompleted?.();
    } catch (error: any) {
      console.error("Onboarding launch error:", error);
      setLaunchSteps((prev) => prev.map((s) => (s.status === "running" ? { ...s, status: "failed", detail: error.message } : s)));
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLaunching(false);
    }
  };

  const reset = () => {
    setStep(0);
    setSelectedBusiness(null);
    setClient({ name: "", email: "", phone: "", service_type_id: "" });
    setDocuments([]);
    setLaunchSteps([]);
    setResults({});
    setFinished(false);
  };

  const statusIcon = (status: StepStatus) => {
    switch (status) {
      case "done": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning": return <CheckCircle className="w-5 h-5 text-yellow-500" />;
      case "failed": return <XCircle className="w-5 h-5 text-red-600" />;
      case "running": return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
              ${i === step ? "bg-rdr-navy text-white" : i < step ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 text-center">{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        ))}
      </div>

      {/* Step 1: Business */}
      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {businesses.map((b) => (
            <Card
              key={b.id}
              onClick={() => setSelectedBusiness(b)}
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedBusiness?.id === b.id ? "ring-2 ring-offset-2" : ""}`}
              style={selectedBusiness?.id === b.id ? { ["--tw-ring-color" as any]: b.brand_color } : undefined}
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center" style={{ backgroundColor: b.brand_color }}>
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-lg">{b.name}</h3>
                {selectedBusiness?.id === b.id && <Badge>Selected</Badge>}
              </CardContent>
            </Card>
          ))}
          {businesses.length === 0 && (
            <p className="col-span-3 text-center text-muted-foreground py-8">
              No businesses found. Apply the onboarding database migration first.
            </p>
          )}
        </div>
      )}

      {/* Step 2: Client details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> New Client for {selectedBusiness?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <div>
              <Label htmlFor="wiz-name">Full Name *</Label>
              <Input id="wiz-name" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="wiz-email">Email *</Label>
              <Input id="wiz-email" type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="wiz-phone">Phone</Label>
              <Input id="wiz-phone" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
            </div>
            <div>
              <Label>Service / Package *</Label>
              <Select value={client.service_type_id} onValueChange={(v) => setClient({ ...client, service_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.default_timeline_days} days)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Documents */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Client Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-gray-50">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-muted-foreground">Click to add documents (you can rename each one below)</span>
              <input type="file" multiple className="hidden" onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ""; }} />
            </label>

            {documents.map((doc, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end border rounded-lg p-3">
                <div>
                  <Label className="text-xs">File</Label>
                  <p className="text-sm truncate font-medium" title={doc.file.name}>{doc.file.name}</p>
                </div>
                <div>
                  <Label className="text-xs">Document name</Label>
                  <Input value={doc.label} onChange={(e) => {
                    const next = [...documents];
                    next[i] = { ...doc, label: e.target.value };
                    setDocuments(next);
                  }} />
                </div>
                <div>
                  <Label className="text-xs">Save to subfolder</Label>
                  <Select value={doc.targetFolder} onValueChange={(v) => {
                    const next = [...documents];
                    next[i] = { ...doc, targetFolder: v };
                    setDocuments(next);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {folderTemplates.map((f) => (
                        <SelectItem key={f.id} value={f.folder_name}>{f.folder_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDocuments(documents.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
                <p className="md:col-span-4 text-xs text-muted-foreground">
                  Will be saved as: <span className="font-mono">{generateFileName(doc.label, doc.file.name)}</span>
                </p>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">No documents yet — you can also skip this and upload later.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Launch */}
      {step === 3 && (
        <div className="space-y-4">
          {!launching && launchSteps.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Rocket className="w-5 h-5" /> Ready to Launch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Business:</strong> {selectedBusiness?.name}</p>
                <p><strong>Client:</strong> {client.name} ({client.email}{client.phone ? `, ${client.phone}` : ""})</p>
                <p><strong>Service:</strong> {serviceTypes.find((s) => s.id === client.service_type_id)?.name}</p>
                <p><strong>Documents:</strong> {documents.length ? documents.map((d) => generateFileName(d.label, d.file.name)).join(", ") : "None"}</p>
                <p><strong>Folders:</strong> "{client.name || "Client"}" + {folderTemplates.length} subfolders ({folderTemplates.map((f) => f.folder_name).join(", ")})</p>
                <p className="text-muted-foreground">
                  Launching will create the client, build their cloud/desktop folders, file the documents, create their
                  TailorWiz / JobIntel 360 / Jobs On Demand Academy and portal accounts (one shared login), email the
                  welcome packet with the login PDF attached, and log everything to the tracker.
                </p>
                <Button onClick={launch} className="bg-rdr-navy hover:bg-rdr-navy/90 mt-2">
                  <Rocket className="w-4 h-4 mr-2" /> Launch Onboarding
                </Button>
              </CardContent>
            </Card>
          )}

          {launchSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {launchSteps.map((s) => (
                  <div key={s.key} className="flex items-start gap-3">
                    {statusIcon(s.status)}
                    <div>
                      <p className={`text-sm font-medium ${s.status === "failed" ? "text-red-600" : ""}`}>{s.label}</p>
                      {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {finished && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Onboarding Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {results.driveFolderUrl && (
                  <p className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4" /> Cloud folder:&nbsp;
                    <a href={results.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex items-center gap-1">
                      Open in Google Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                )}
                {results.desktopPath && (
                  <p className="flex items-center gap-2"><FolderTree className="w-4 h-4" /> Desktop folder (via Drive sync): <span className="font-mono">{results.desktopPath}</span></p>
                )}
                {results.accounts && (
                  <div className="flex items-start gap-2">
                    <KeyRound className="w-4 h-4 mt-0.5" />
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(results.accounts).map(([platform, r]) => (
                        <Badge key={platform} variant={r.status === "created" ? "default" : "secondary"}
                          className={r.status === "created" ? "bg-green-600" : "bg-yellow-500 text-white"}>
                          {platform}: {r.status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {results.emailSubject && (
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> Sent "{results.emailSubject}" with the login PDF attached</p>
                )}
                <Button variant="outline" onClick={reset} className="mt-2">Onboard Another Client</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      {!(step === 3 && (launching || finished)) && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || launching}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue} className="bg-rdr-navy hover:bg-rdr-navy/90">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
