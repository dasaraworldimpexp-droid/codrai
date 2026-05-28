import { Router } from "express";
import { appendMemory, askMemory, compressMemory, indexMemory, memoryAnalytics, memoryGraph, memorySummary, ragSearch, retrieveMemory, searchMemory } from "../controllers/memory.controller.js";

const router = Router();

router.get("/search", searchMemory);
router.get("/retrieve", retrieveMemory);
router.get("/rag", ragSearch);
router.post("/ask", askMemory);
router.post("/compress", compressMemory);
router.get("/analytics", memoryAnalytics);
router.get("/graph", memoryGraph);
router.get("/summary", memorySummary);
router.post("/index", indexMemory);
router.post("/", appendMemory);

export default router;
