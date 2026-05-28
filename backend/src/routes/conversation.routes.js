import { Router } from "express";
import { appendUserMessage, archiveConversation, createConversation, deleteConversation, getConversationMessages, listConversations } from "../controllers/conversation.controller.js";

const router = Router();

router.get("/", listConversations);
router.post("/", createConversation);
router.get("/:conversationId/messages", getConversationMessages);
router.post("/:conversationId/messages", appendUserMessage);
router.post("/:conversationId/archive", archiveConversation);
router.delete("/:conversationId", deleteConversation);

export default router;
