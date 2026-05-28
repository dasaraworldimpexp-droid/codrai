import { chromium } from "playwright";
import path from "node:path";

export class BrowserAutomationService {
  constructor({ headless = true, timeoutMs = 30000, sessionRoot = process.env.BROWSER_SESSION_ROOT || "/tmp/codrai-browser-sessions" } = {}) {
    this.headless = headless;
    this.timeoutMs = timeoutMs;
    this.sessionRoot = sessionRoot;
  }

  async navigate({ url, screenshot = false, extractText = true }) {
    this.#assertSafeUrl(url);
    const browser = await chromium.launch(this.#launchOptions());
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
      const result = {
        url: page.url(),
        title: await page.title(),
        text: extractText ? (await page.locator("body").innerText({ timeout: 5000 })).slice(0, 20000) : undefined,
      };
      if (screenshot) {
        result.screenshotBase64 = (await page.screenshot({ fullPage: true })).toString("base64");
        result.screenshotMimeType = "image/png";
      }
      return result;
    } finally {
      await browser.close();
    }
  }

  async click({ url, selector }) {
    this.#assertSafeUrl(url);
    const browser = await chromium.launch(this.#launchOptions());
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
      await page.click(selector, { timeout: this.timeoutMs });
      return { url: page.url(), title: await page.title(), text: (await page.locator("body").innerText()).slice(0, 20000) };
    } finally {
      await browser.close();
    }
  }

  async fill({ url, fields = {}, submitSelector }) {
    this.#assertSafeUrl(url);
    const browser = await chromium.launch(this.#launchOptions());
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
      for (const [selector, value] of Object.entries(fields)) {
        await page.fill(selector, String(value), { timeout: this.timeoutMs });
      }
      if (submitSelector) await page.click(submitSelector, { timeout: this.timeoutMs });
      return { url: page.url(), title: await page.title(), text: (await page.locator("body").innerText()).slice(0, 20000) };
    } finally {
      await browser.close();
    }
  }

  async workflow({ startUrl, steps = [], workspaceId, sessionId }) {
    if (!startUrl) throw new Error("startUrl is required for browser.workflow.");
    this.#assertSafeUrl(startUrl);
    const maxSteps = Number(process.env.BROWSER_MAX_STEPS || 10);
    const userDataDir = path.join(this.sessionRoot, this.#safeSegment(workspaceId || "local-workspace"), this.#safeSegment(sessionId || "default"));
    const context = await chromium.launchPersistentContext(userDataDir, {
      ...this.#launchOptions(),
      viewport: { width: 1280, height: 720 },
    });
    try {
      const page = context.pages()[0] || await context.newPage();
      const memory = [];
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
      memory.push(await this.#snapshot(page, "navigate"));

      for (const step of steps.slice(0, maxSteps)) {
        if (step.action === "navigate") {
          this.#assertSafeUrl(step.url);
          await page.goto(step.url, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
        } else if (step.action === "click") {
          await page.click(step.selector, { timeout: this.timeoutMs });
        } else if (step.action === "fill") {
          await page.fill(step.selector, String(step.value || ""), { timeout: this.timeoutMs });
        } else if (step.action === "press") {
          await page.keyboard.press(step.key);
        } else if (step.action === "waitForSelector") {
          await page.waitForSelector(step.selector, { timeout: Number(step.timeoutMs || this.timeoutMs) });
        } else if (step.action === "extract") {
          memory.push(await this.#snapshot(page, "extract", step.selector));
          continue;
        } else {
          throw new Error(`Unsupported browser workflow action: ${step.action}`);
        }
        memory.push(await this.#snapshot(page, step.action));
      }

      return {
        url: page.url(),
        title: await page.title(),
        memory,
        screenshotBase64: (await page.screenshot({ fullPage: false })).toString("base64"),
        screenshotMimeType: "image/png",
      };
    } finally {
      await context.close();
    }
  }

  async #snapshot(page, action, selector) {
    const text = selector
      ? await page.locator(selector).innerText({ timeout: 5000 })
      : await page.locator("body").innerText({ timeout: 5000 });
    return {
      action,
      url: page.url(),
      title: await page.title(),
      text: text.slice(0, 12000),
      capturedAt: new Date().toISOString(),
    };
  }

  #assertSafeUrl(value) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw Object.assign(new Error("Browser automation requires a valid URL."), { statusCode: 400 });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw Object.assign(new Error("Browser automation only allows http and https URLs."), { statusCode: 400 });
    }
    const blockedHosts = new Set(["169.254.169.254", "metadata.google.internal"]);
    if (blockedHosts.has(parsed.hostname)) {
      throw Object.assign(new Error("Browser automation blocked a sensitive metadata endpoint."), { statusCode: 403 });
    }
  }

  #safeSegment(value) {
    return String(value || "default").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  }

  #launchOptions() {
    return {
      headless: this.headless,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    };
  }
}
