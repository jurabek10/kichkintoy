import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  addAlbumCommentInputSchema,
  albumAudienceResponseSchema,
  albumCommentSchema,
  albumListResponseSchema,
  albumPostDetailSchema,
  albumReactionSummarySchema,
  albumStatusSchema,
  createAlbumPostInputSchema,
  updateAlbumPostBodySchema,
} from "../albums.js";
import { centerIdInputSchema, successResponseSchema } from "./common.contract.js";

const albumPostIdInputSchema = z.object({ postId: uuidSchema });

const staffListInputSchema = z.object({
  centerId: uuidSchema,
  status: albumStatusSchema.optional(),
});

const parentListInputSchema = z
  .object({
    childId: uuidSchema.optional(),
  })
  .optional();

const updateAlbumPostInputSchema = albumPostIdInputSchema.extend({
  body: updateAlbumPostBodySchema,
});

const addAlbumCommentProcedureInputSchema = albumPostIdInputSchema.extend({
  body: addAlbumCommentInputSchema,
});

const deleteAlbumCommentInputSchema = albumPostIdInputSchema.extend({
  commentId: uuidSchema,
});

export const albumsContract = {
  audience: oc.input(centerIdInputSchema).output(albumAudienceResponseSchema),
  staffList: oc.input(staffListInputSchema).output(albumListResponseSchema),
  parentList: oc.input(parentListInputSchema).output(albumListResponseSchema),
  detail: oc.input(albumPostIdInputSchema).output(albumPostDetailSchema),
  create: oc.input(createAlbumPostInputSchema).output(albumPostDetailSchema),
  update: oc.input(updateAlbumPostInputSchema).output(albumPostDetailSchema),
  publish: oc.input(albumPostIdInputSchema).output(albumPostDetailSchema),
  delete: oc.input(albumPostIdInputSchema).output(successResponseSchema),
  addComment: oc
    .input(addAlbumCommentProcedureInputSchema)
    .output(albumCommentSchema),
  deleteComment: oc.input(deleteAlbumCommentInputSchema).output(successResponseSchema),
  toggleReaction: oc
    .input(albumPostIdInputSchema)
    .output(albumReactionSummarySchema),
};
