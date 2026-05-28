import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export class FileTextExtractorService {
  async extract({ buffer, mimeType, originalName }) {
    if (mimeType === "application/pdf" || originalName.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text || "";
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      originalName.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    }

    if (mimeType?.startsWith("text/") || /\.(md|txt|csv|json|js|jsx|ts|tsx|py|css|html)$/i.test(originalName)) {
      return buffer.toString("utf8");
    }

    return "";
  }
}
