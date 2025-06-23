import express from "express";
import { MediaController } from "@/presentation/controllers/media.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = express.Router();
const mediaController = new MediaController();

// All media routes require authentication
router.use(requireAuth);

// Routes for project media
router.get(
  "/projects/:projectId/media",
  mediaController.getProjectMedia.bind(mediaController)
);

router.post(
  "/projects/:projectId/media/upload",
  mediaController.uploadMiddleware,
  mediaController.uploadMedia.bind(mediaController)
);

router.post(
  "/projects/:projectId/media/presigned-url",
  mediaController.getPresignedUrl.bind(mediaController)
);

// Batch presigned URLs for efficient bulk upload
router.post(
  "/projects/:projectId/media/batch-presigned-urls",
  mediaController.getBatchPresignedUrls.bind(mediaController)
);

// Confirm batch upload completion
router.post(
  "/projects/:projectId/media/confirm-batch-upload",
  mediaController.confirmBatchUpload.bind(mediaController)
);

// Development only - Bulk upload from folder path
router.post(
  "/projects/:projectId/media/bulk-upload",
  mediaController.bulkUpload.bind(mediaController)
);

// Development only - Test R2 connection
router.post(
  "/projects/:projectId/media/test-r2",
  mediaController.testR2Connection.bind(mediaController)
);

// Get bulk upload progress
router.get(
  "/bulk-upload/:sessionId/progress",
  mediaController.getBulkUploadProgress.bind(mediaController)
);

// Cancel bulk upload
router.post(
  "/bulk-upload/:sessionId/cancel",
  mediaController.cancelBulkUpload.bind(mediaController)
);

// Routes for individual media items
router.get("/media/:id", mediaController.getMedia.bind(mediaController));

router.delete("/media/:id", mediaController.deleteMedia.bind(mediaController));

router.patch("/media/:id/elo", mediaController.updateElo.bind(mediaController));

router.patch(
  "/media/:id/metadata",
  mediaController.updateMediaMetadata.bind(mediaController)
);

// Search routes
router.get(
  "/media/search/by-prompt",
  mediaController.getMediaByPrompt.bind(mediaController)
);

// Admin route for all media
router.get("/media", mediaController.getAllMedia.bind(mediaController));

// Get existing filenames for duplicate detection
router.get(
  "/projects/:projectId/media/filenames",
  mediaController.getExistingFilenames.bind(mediaController)
);

export { router as mediaRoutes };
