import { Router } from "express";
import multer from "multer";
import { listObjects, objectStorageStatus, readSignedObject, searchFiles, uploadFiles, uploadObjects } from "../controllers/file.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.UPLOAD_LIMIT_BYTES || 25 * 1024 * 1024), files: Number(process.env.UPLOAD_LIMIT_FILES || 8) },
  fileFilter: (_req, file, cb) => {
    const blocked = /(?:x-msdownload|x-sh|x-bat|x-msdos-program|java-archive)/i.test(file.mimetype || "") || /\.(exe|bat|cmd|ps1|sh|jar|dll)$/i.test(file.originalname || "");
    if (blocked) return cb(Object.assign(new Error("This upload type is blocked by CODRAI production upload policy."), { statusCode: 415 }));
    return cb(null, true);
  },
});

router.post("/upload", upload.array("files"), uploadFiles);
router.get("/search", searchFiles);
router.get("/objects/status", objectStorageStatus);
router.post("/objects/upload", upload.array("files"), uploadObjects);
router.get("/objects", listObjects);
router.get("/objects/:key", readSignedObject);

export default router;
