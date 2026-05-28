export class ScreenUnderstandingService {
  constructor({ aiRuntimeEngine, ocrProvider }) {
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.ocrProvider = ocrProvider;
  }

  async analyze({ workspaceId, userId, projectId, image, prompt }) {
    const ocr = this.ocrProvider ? await this.ocrProvider.extractText(image) : null;
    return this.aiRuntimeEngine.execute({
      workspaceId,
      userId,
      projectId,
      taskType: "reasoning",
      intent: "Analyze screen or image context",
      input: {
        text: [prompt, ocr ? `OCR:\n${ocr.text}` : ""].filter(Boolean).join("\n\n"),
      },
      attachments: image ? [{ type: "image", image }] : [],
      metadata: { subsystem: "screen_understanding" },
    });
  }
}
