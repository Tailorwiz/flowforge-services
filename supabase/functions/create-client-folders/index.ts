import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateFoldersRequest {
  clientId: string;
}

// ---------------------------------------------------------------
// Google Drive auth via service account (GOOGLE_SERVICE_ACCOUNT_JSON secret)
// ---------------------------------------------------------------
function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getDriveAccessToken(): Promise<string | null> {
  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!saJson) return null;

  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
  }
  const token = await tokenRes.json();
  return token.access_token as string;
}

async function createDriveFolder(accessToken: string, name: string, parentId?: string): Promise<{ id: string; webViewLink: string }> {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    },
  );
  if (!res.ok) throw new Error(`Drive folder create failed (${name}): ${await res.text()}`);
  return await res.json();
}

async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  content: Uint8Array,
  parentId: string,
): Promise<string> {
  const metadata = JSON.stringify({ name: fileName, parents: [parentId] });
  const boundary = "onboarding_boundary_" + crypto.randomUUID();
  const encoder = new TextEncoder();

  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + content.length + tail.length);
  body.set(head, 0);
  body.set(content, head.length);
  body.set(tail, head.length + content.length);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive file upload failed (${fileName}): ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

// ---------------------------------------------------------------
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { clientId }: CreateFoldersRequest = await req.json();
    if (!clientId) throw new Error("clientId is required");

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*, businesses:business_id (*)")
      .eq("id", clientId)
      .single();
    if (clientErr || !client) throw new Error(`Client not found: ${clientErr?.message}`);

    const business = client.businesses;
    if (!business) throw new Error("Client has no business assigned");

    const { data: folderTemplates } = await supabase
      .from("business_folder_templates")
      .select("folder_name, sort_order")
      .eq("business_id", business.id)
      .order("sort_order");

    const subfolderNames: string[] = (folderTemplates || []).map((f: any) => f.folder_name);

    // Documents uploaded through the onboarding wizard, waiting to be mirrored to Drive
    const { data: docs } = await supabase
      .from("document_uploads")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .filter("metadata->>onboarding", "eq", "true");

    const desktopPath = business.desktop_folder_path
      ? `${business.desktop_folder_path.replace(/[\\/]+$/, "")}/${client.name}`
      : null;

    const accessToken = await getDriveAccessToken();

    if (!accessToken) {
      // Drive not configured yet — record what we would have done so nothing is lost
      await supabase.from("onboarding_records").upsert({
        client_id: clientId,
        business_id: business.id,
        desktop_path: desktopPath,
        status: "needs_attention",
      }, { onConflict: "client_id" });

      await supabase.from("onboarding_events").insert({
        client_id: clientId,
        business_id: business.id,
        event_type: "folder_created",
        title: "Cloud folders skipped — Google Drive not configured",
        status: "failed",
        detail: { reason: "GOOGLE_SERVICE_ACCOUNT_JSON secret is not set", planned_subfolders: subfolderNames },
      });

      return new Response(JSON.stringify({
        success: true,
        driveConfigured: false,
        message: "Google Drive is not configured (GOOGLE_SERVICE_ACCOUNT_JSON secret missing). Folders were not created in the cloud.",
        desktopPath,
      }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 1. Root client folder inside the business's designated parent folder
    const rootFolder = await createDriveFolder(accessToken, client.name, business.drive_parent_folder_id || undefined);

    // 2. Subfolders from the business template
    const subfolderIds: Record<string, string> = {};
    for (const name of subfolderNames) {
      const sub = await createDriveFolder(accessToken, name, rootFolder.id);
      subfolderIds[name] = sub.id;
    }

    // 3. Mirror wizard-uploaded documents into their target subfolders,
    //    using the final names generated from the business naming pattern.
    const uploadedDocs: { name: string; folder: string }[] = [];
    for (const doc of docs || []) {
      const meta = (doc.metadata || {}) as Record<string, string>;
      const targetFolderName = meta.target_folder && subfolderIds[meta.target_folder]
        ? meta.target_folder
        : subfolderNames[0];
      const parentId = subfolderIds[targetFolderName] || rootFolder.id;

      const { data: fileData, error: dlErr } = await supabase.storage
        .from(doc.bucket_name)
        .download(doc.file_path);
      if (dlErr || !fileData) {
        console.error(`Could not download ${doc.file_path}: ${dlErr?.message}`);
        continue;
      }
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      await uploadFileToDrive(accessToken, doc.original_name, doc.mime_type, bytes, parentId);
      uploadedDocs.push({ name: doc.original_name, folder: targetFolderName });

      await supabase.from("onboarding_events").insert({
        client_id: clientId,
        business_id: business.id,
        event_type: "document_saved",
        title: `Saved "${doc.original_name}" to ${targetFolderName}`,
        detail: { file: doc.original_name, folder: targetFolderName, drive: true },
      });
    }

    await supabase.from("onboarding_records").upsert({
      client_id: clientId,
      business_id: business.id,
      drive_folder_id: rootFolder.id,
      drive_folder_url: rootFolder.webViewLink,
      desktop_path: desktopPath,
    }, { onConflict: "client_id" });

    await supabase.from("onboarding_events").insert({
      client_id: clientId,
      business_id: business.id,
      event_type: "folder_created",
      title: `Created client folder "${client.name}" with ${subfolderNames.length} subfolders`,
      detail: { drive_folder_url: rootFolder.webViewLink, subfolders: subfolderNames, desktop_path: desktopPath },
    });

    return new Response(JSON.stringify({
      success: true,
      driveConfigured: true,
      driveFolderId: rootFolder.id,
      driveFolderUrl: rootFolder.webViewLink,
      desktopPath,
      subfolders: subfolderNames,
      uploadedDocuments: uploadedDocs,
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in create-client-folders:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
