export class Codrai {
  constructor({ apiKey, baseUrl = "http://localhost:5000/api/v1" }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.chat = {
      completions: {
        create: (payload) => this.request("/chat/completions", { method: "POST", body: payload }),
        stream: (payload) => this.request("/chat/stream", { method: "POST", body: payload, raw: true }),
      },
    };
  }

  async request(path, { method = "GET", body, raw = false } = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || "CODRAI API request failed.");
    }
    return raw ? response : response.json();
  }
}
