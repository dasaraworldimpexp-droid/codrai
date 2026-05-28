# CODRAI Provider Activation Report

## Activation Work Completed

The encrypted provider settings system now covers the full registered CODRAI provider set:

- OpenAI: `OPENAI_API_KEY`
- Anthropic Claude: `ANTHROPIC_API_KEY`
- Gemini: `GEMINI_API_KEY`
- OpenRouter: `OPENROUTER_API_KEY`
- xAI Grok: `XAI_API_KEY`
- Groq: `GROQ_API_KEY`
- Mistral: `MISTRAL_API_KEY`
- DeepSeek: `DEEPSEEK_API_KEY`
- Together AI: `TOGETHER_API_KEY`
- Ollama local: `OLLAMA_API_KEY` optional, `OLLAMA_BASE_URL` for daemon URL
- fal.ai: `FAL_API_KEY`
- Stability AI: `STABILITY_API_KEY`
- ElevenLabs: `ELEVENLABS_API_KEY`

## Runtime Integration

- API runtime resolves encrypted workspace provider keys through `ProviderSettingsService`.
- OpenAI-compatible providers now resolve workspace keys at execution, streaming, and health-check time.
- Worker runtime now uses the same provider settings service, so background queue jobs can use encrypted workspace keys.
- Provider validation reports real `missing`, `ok`, or `error` states and does not fake readiness.

## Activation Flow

1. Open `http://localhost:5173/settings/providers`.
2. Paste a real key for the provider.
3. Save the key.
4. Run `Test all providers`.
5. Confirm the provider moves from `MISSING` to `ACTIVE` only after the upstream health check succeeds.

## Known Operational Notes

- Ollama does not require an API key by default, but it does require an accessible OpenAI-compatible daemon at `OLLAMA_BASE_URL`.
- Provider keys saved in PostgreSQL are masked in the UI and are not returned in plaintext.
- Invalid keys are stored only after explicit save, but provider health remains `error` until the upstream validates.

