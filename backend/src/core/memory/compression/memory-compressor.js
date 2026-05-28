export class MemoryCompressor {
  constructor({ tokenBudget = 6000, summarizer } = {}) {
    this.tokenBudget = tokenBudget;
    this.summarizer = summarizer;
  }

  async compress({ objective, blocks }) {
    const rankedBlocks = blocks
      .map((block) => ({ ...block, score: this.#scoreBlock(objective, block) }))
      .sort((a, b) => b.score - a.score);

    const selected = [];
    let approxTokens = 0;

    for (const block of rankedBlocks) {
      const blockTokens = this.#approxTokens(block.content);
      if (approxTokens + blockTokens <= this.tokenBudget) {
        selected.push(block);
        approxTokens += blockTokens;
      }
    }

    if (selected.length === 0 && rankedBlocks.length > 0) {
      const summary = await this.summarizer?.summarize?.({ objective, blocks: rankedBlocks });
      return { blocks: [{ type: "compressed_summary", content: summary }], approxTokens: this.#approxTokens(summary) };
    }

    return { blocks: selected, approxTokens };
  }

  #scoreBlock(objective, block) {
    const text = JSON.stringify(block.content || "").toLowerCase();
    const terms = String(objective || "").toLowerCase().split(/\W+/).filter(Boolean);
    const matches = terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
    const typeBoost = ["project", "semantic", "short_term"].includes(block.type) ? 2 : 1;
    return matches + typeBoost;
  }

  #approxTokens(content) {
    return Math.ceil(JSON.stringify(content || "").length / 4);
  }
}
