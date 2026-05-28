import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class DocumentEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.DOCUMENT,
      projectType: "document",
      name: "Document Engine",
      description: "Creates DOCX/PDF/spreadsheet-ready business documents with templates, structure, and export steps.",
      artifacts: [CREATION_ARTIFACT_TYPES.DOCUMENT],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.aiStep({ id: "outline", title: "Create document outline", taskType: AI_TASK_TYPES.DOCUMENT, prompt: `Create document outline for: ${request.goal}` }),
        this.aiStep({ id: "draft", title: "Draft document content", taskType: AI_TASK_TYPES.DOCUMENT, prompt: `Draft production document for: ${request.goal}`, dependsOn: ["outline"] }),
        this.aiStep({ id: "export", title: "Prepare document export", taskType: AI_TASK_TYPES.DOCUMENT, prompt: `Prepare DOCX/PDF export instructions and sections for: ${request.goal}`, dependsOn: ["draft"], background: true }),
      ],
    });
  }
}
