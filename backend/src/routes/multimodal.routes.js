import { Router } from "express";
import { analyzeImage, bootstrapWhisper, desktopAction, desktopStatus, exportTranscript, inspectMedia, multimodalStatus, multimodalUpload, ocrImage, parseDocument, queueTranscription, searchTranscripts, transcribeAudio, transcriptAnalytics, transcriptHistory, whisperDiagnostics } from "../controllers/multimodal.controller.js";

const router = Router();

router.get("/status", multimodalStatus);
router.get("/desktop/status", desktopStatus);
router.post("/desktop/actions", desktopAction);
router.post("/ocr", multimodalUpload.single("file"), ocrImage);
router.post("/vision/analyze", multimodalUpload.single("file"), analyzeImage);
router.post("/audio/transcribe", multimodalUpload.single("file"), transcribeAudio);
router.post("/audio/transcribe/queue", multimodalUpload.single("file"), queueTranscription);
router.get("/audio/transcripts", transcriptHistory);
router.get("/audio/transcripts/search", searchTranscripts);
router.get("/audio/transcripts/analytics", transcriptAnalytics);
router.get("/audio/transcripts/:transcriptId/export", exportTranscript);
router.get("/audio/whisper/diagnostics", whisperDiagnostics);
router.post("/audio/whisper/bootstrap", bootstrapWhisper);
router.post("/documents/parse", multimodalUpload.single("file"), parseDocument);
router.post("/media/inspect", multimodalUpload.single("file"), inspectMedia);

export default router;
