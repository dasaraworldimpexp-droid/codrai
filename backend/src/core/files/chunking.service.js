export class ChunkingService {
  chunk(text, { maxChars = 1800, overlap = 180 } = {}) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];

    const chunks = [];
    let start = 0;
    while (start < cleaned.length) {
      const end = Math.min(cleaned.length, start + maxChars);
      chunks.push(cleaned.slice(start, end));
      start = end - overlap;
      if (start < 0 || end === cleaned.length) break;
    }
    return chunks;
  }
}
