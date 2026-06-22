/**
 * Mobile media upload — the parent uploads a medicine photo and a drawn
 * signature when creating a medication request. Same three-step flow the web
 * uses: ask the API for a signed URL, PUT the bytes straight to storage, then
 * tell the API the upload finished. Returns the media asset id.
 *
 * Uses the legacy expo-file-system API (SDK 54 split the new File/Directory API
 * out); `uploadAsync` streams a local file with a binary PUT, which is what the
 * presigned URL expects.
 */
import * as FileSystem from 'expo-file-system/legacy';

import { orpc } from '@/lib/orpc';

type UploadPurpose = Parameters<typeof orpc.media.createUploadUrl>[0]['purpose'];

export type UploadParams = {
  uri: string;
  centerId: string;
  mimeType: string;
  fileName: string;
  /** Where the asset belongs — gates access on the server. Defaults to medication. */
  purpose?: UploadPurpose;
};

/** Upload a local file to storage and return the completed media asset id. */
export async function uploadMedia(params: UploadParams): Promise<string> {
  const info = await FileSystem.getInfoAsync(params.uri);
  const sizeBytes = info.exists && info.size ? info.size : 1;

  const signed = await orpc.media.createUploadUrl({
    centerId: params.centerId,
    fileName: params.fileName,
    mimeType: params.mimeType,
    sizeBytes,
    purpose: params.purpose ?? 'medication',
  });

  const result = await FileSystem.uploadAsync(signed.uploadUrl, params.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': params.mimeType },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status})`);
  }

  const asset = await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId });
  return asset.id;
}

/** Back-compat alias — the medication composer uploads with the default purpose. */
export const uploadMedication = uploadMedia;

/** Write a base64 PNG (e.g. a captured signature) to a temp file for upload. */
export async function writeBase64Png(base64: string): Promise<string> {
  const cleaned = base64.replace(/^data:image\/\w+;base64,/, '');
  const uri = `${FileSystem.cacheDirectory ?? ''}signature-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(uri, cleaned, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}
