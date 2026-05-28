# CODRAI Frontend Feature Architecture

The frontend is organized by product capability, not by technical file type.

Feature modules:
- `ai-studio`: conversations, composer, attachments, model selector, output preview.
- `workspace`: workspace switcher, folders, assets, saved prompts, team state.
- `projects`: project list, project detail, version history, generated content.
- `agents`: agent catalog, run history, delegation view, approval inbox.
- `billing`: plans, credits, usage, Razorpay checkout.
- `settings`: account, preferences, memory controls, integrations, devices.

Shared shell modules belong in `layouts` and reusable primitives belong in `shared`.
