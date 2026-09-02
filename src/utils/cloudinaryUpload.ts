import { apiFetch } from "@/utils/api";

// Asset kinds the backend signature endpoint (`POST /cloudionary`) understands.
export type CloudinaryAssetType =
  | "selfie"
  | "id_front"
  | "id_back"
  | "declaration_video"
  | "deposit_proof"
  | "profile_image";

interface UploadSignature {
  timestamp: number;
  folder: string;
  signature: string;
  cloudName: string;
  public_id: string;
  apiKey: string;
  resourceType: "image" | "video";
}

// Downscale a large image in the browser before upload. Non-images (and PDFs)
// pass through untouched. Falls back to the original file if anything fails.
export async function optimizeImage(
  source: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<{ blob: Blob; filename: string }> {
  if (!source.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return { blob: source, filename: source.name };
  }

  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return { blob: source, filename: source.name };
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return { blob: source, filename: source.name };

    const baseName = source.name.replace(/\.[^.]+$/, "") || "image";
    return { blob, filename: `${baseName}.jpg` };
  } catch {
    return { blob: source, filename: source.name };
  }
}

// True once an asset is already stored on Cloudinary (e.g. a KYC doc reloaded
// from the DB) — no need to re-upload it.
export const isCloudinaryUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/res\.cloudinary\.com\//.test(value);

// Turn a data: URL (or plain base64) into a Blob for FormData upload.
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(head || "");
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const isBase64 = /;base64/i.test(head || "");
  const binary = isBase64 ? atob(body || "") : decodeURIComponent(body || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Ask the backend for a signed upload, then upload straight to Cloudinary and
// return the resulting secure URL. Mirrors the flow used by the client/admin
// portals (`POST /cloudionary` → direct FormData upload).
export async function uploadAsset(
  assetType: CloudinaryAssetType,
  file: Blob,
  filename: string,
): Promise<string> {
  const signed = await apiFetch<UploadSignature>("/cloudionary", {
    method: "POST",
    body: JSON.stringify({ assetType }),
  });

  if (!signed?.signature || !signed.cloudName || !signed.apiKey) {
    throw new Error((signed?.message as string) || "Failed to prepare the upload.");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    signed.cloudName,
  )}/${signed.resourceType}/upload`;

  const body = new FormData();
  body.append("file", file, filename);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
  body.append("public_id", signed.public_id);
  body.append("overwrite", "true");
  body.append("invalidate", "true");

  const res = await fetch(endpoint, { method: "POST", body });
  const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };

  if (res.ok && data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || `Upload failed for ${filename}.`);
}
