import { oc } from "@orpc/contract";
import {
  completeMediaUploadInputSchema,
  createMediaUploadUrlInputSchema,
  mediaAssetSchema,
  mediaDownloadUrlInputSchema,
  mediaDownloadUrlSchema,
  mediaUploadUrlSchema,
} from "../media.js";

export const mediaContract = {
  createUploadUrl: oc
    .input(createMediaUploadUrlInputSchema)
    .output(mediaUploadUrlSchema),
  completeUpload: oc
    .input(completeMediaUploadInputSchema)
    .output(mediaAssetSchema),
  getDownloadUrl: oc
    .input(mediaDownloadUrlInputSchema)
    .output(mediaDownloadUrlSchema),
};
