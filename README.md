# Decart Virtual Try-On Examples

Two example apps showing how to add real-time virtual try-on to your web app using Decart's `lucy_2_rt` model.

## Examples

| Example | Description | Key feature |
|---------|-------------|-------------|
| [`ecommerce/`](examples/ecommerce/) | "Try it on" button on product pages | Modal with camera + AI overlay |
| [`standalone/`](examples/standalone/) | Dedicated try-on experience | Drag-and-drop products onto live video |

## Core integration (3 steps)

The entire Decart integration is ~60 lines:

### 1. Create an ephemeral token (server-side)

```ts
// app/api/tokens/route.ts
import { createDecartClient } from "@decartai/sdk";

const client = createDecartClient({ apiKey: process.env.DECART_API_KEY });
const token = await client.tokens.create();
```

### 2. Connect camera to the realtime model

```ts
import { createDecartClient, models } from "@decartai/sdk";

const client = createDecartClient({ apiKey: token.apiKey });
const rtClient = await client.realtime.connect(cameraStream, {
  model: models.realtime("lucy_2_rt"),
  onRemoteStream: (stream) => { videoElement.srcObject = stream; },
  initialState: { prompt: { text: "Show person as is", enhance: false } },
});
```

### 3. Send garment image + prompt

```ts
rtClient.setImage(garmentBlob, {
  prompt: { text: "Substitute the current top with a blue denim jacket", enhance: false },
});
```

## Best practices

### Prompt structure

The model works best with structured prompts:

- **Substitute**: `"Substitute the [current garment] with [color] [material] [item] with [fit/details]"`
- **Add**: `"Add [color] [material] [item] to the person's [body part]"`
- Include colors, textures, patterns, fit — aim for 20–30 words
- Use generic refs when you don't know the current outfit: `"the current top"`, `"the current bottoms"`

### Reference images

- Clean garment images work best — just the clothing, no person wearing it
- White or clean backgrounds are ideal
- The model reproduces what it sees — clear garment = better results

### Enhance prompt (optional)

For dynamic or user-uploaded images, use GPT-4o-mini to automatically generate a well-structured prompt from the garment image. Both examples include an optional `/api/enhance-prompt` route that does this. Set `OPENAI_API_KEY` to enable it.

## Architecture

```
┌──────────────────┐        ┌──────────────┐        ┌────────────────┐
│   Browser         │        │  Next.js API  │        │  External APIs  │
│                   │        │               │        │                 │
│  Camera stream ───┼───────►│               │        │                 │
│                   │        │  /api/tokens ─┼───────►│  Decart SDK     │
│  Decart SDK ◄─────┼────────┼── apiKey      │        │                 │
│  (realtime)       │        │               │        │                 │
│                   │        │  /api/enhance─┼───────►│  OpenAI         │
│  AI video stream  │        │   -prompt     │        │  (optional)     │
└──────────────────┘        └──────────────┘        └────────────────┘
```

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Decart realtime connection |
| `OPENAI_API_KEY` | No | Enhance prompt (auto-generate smart prompts from garment images) |

## License

MIT
