# Decart Virtual Try-On Examples

> Add real-time virtual try-on to any web app using Decart's `lucy_2_rt` realtime model.

Two production-ready Next.js examples that show how to integrate Decart's realtime virtual try-on. Each example is self-contained and runs independently.

| Example | Use case | Integration style |
|---------|----------|-------------------|
| [**E-commerce**](examples/ecommerce/) | "Try it on" button on product pages | Modal overlay — click to open, camera + AI in a popup |
| [**Standalone**](examples/standalone/) | Dedicated try-on experience | Full-page — products sidebar, drag onto live video |

---

## Prerequisites

- A Decart account at [platform.decart.ai](https://platform.decart.ai)
- A [Decart API key](https://docs.platform.decart.ai/getting-started/authentication)
- Node.js 18+

```bash
export DECART_API_KEY="your-api-key-here"
```

> **Note:** Both examples use [client tokens](https://docs.platform.decart.ai/getting-started/client-tokens) — your permanent API key stays on the server, and the browser only receives a short-lived ephemeral token.

---

## Core Decart integration

The entire integration is three steps.

### Step 1: Create a client token (server-side)

Your backend creates a short-lived token using your permanent API key. The browser never sees your real key.

```typescript
// app/api/tokens/route.ts
import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";

export async function POST() {
  const client = createDecartClient({
    apiKey: process.env.DECART_API_KEY,
  });
  const token = await client.tokens.create();
  return NextResponse.json(token);
}
```

> **Tip:** Client tokens have a 10-minute TTL. Create a new token each time a user opens a try-on session. See the [Client Tokens guide](https://docs.platform.decart.ai/getting-started/client-tokens) for rotation strategies.

### Step 2: Connect camera to the realtime model

The frontend fetches a token, opens the camera, and establishes a WebRTC connection to `lucy_2_rt`.

```typescript
import { createDecartClient, models } from "@decartai/sdk";

// 1. Get a client token from your backend
const res = await fetch("/api/tokens", { method: "POST" });
const { apiKey } = await res.json();

// 2. Open the user's camera
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: "user" },
});

// 3. Connect to Decart's realtime model
const client = createDecartClient({ apiKey });

const rtClient = await client.realtime.connect(stream, {
  model: models.realtime("lucy_2_rt"),
  onRemoteStream: (remoteStream) => {
    // Attach the AI-transformed video to a <video> element
    document.getElementById("output").srcObject = remoteStream;
  },
  initialState: {
    prompt: { text: "Show person as is", enhance: false },
  },
});
```

### Step 3: Send a garment image + prompt

Call `setImage()` to send a reference garment image with a descriptive prompt. The model applies the garment to the person in real-time.

```typescript
await rtClient.setImage(garmentBlob, {
  prompt: "Substitute the current top with a classic blue denim jacket with a relaxed fit",
  enhance: false,
});
```

Call `setImage()` again at any time to switch garments — no need to reconnect.

---

## Best practices

### Prompt structure

The model works best with structured prompts that follow a **substitute** or **add** pattern:

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Substitute** | Replacing an existing garment | `"Substitute the current top with a red plaid flannel shirt with a relaxed fit"` |
| **Add** | Adding something the person isn't wearing | `"Add a wide-brimmed straw hat to the person's head"` |

**Writing good prompts:**

- Be specific — include color, material, texture, pattern, and fit
- Aim for 20–30 words
- Use generic references when you don't know the current outfit: `"the current top"`, `"the current bottoms"`
- Don't just say "a shirt" — say `"a light blue linen shirt with a relaxed fit and rolled sleeves"`

**Examples:**

```
✅ "Substitute the current top with a bright red hoodie with an oversized casual fit"
✅ "Substitute the current top with a black leather bomber jacket with ribbed cuffs"
✅ "Add a navy baseball cap to the person's head"

❌ "Put a jacket on the person"        (too vague — no color, material, or fit)
❌ "Red hoodie"                         (missing action and context)
```

### Reference images

- **Clean garment images work best** — just the clothing item, no person wearing it
- **White or clean backgrounds** are ideal
- **At least 512x512 pixels** — the model reproduces what it sees, so clear garment = better results

### Enhance prompt (optional)

For user-uploaded garment images where you don't have a pre-written prompt, use GPT-4o-mini to auto-generate one. Both examples include an optional `/api/enhance-prompt` endpoint:

```typescript
const formData = new FormData();
formData.append("image", garmentBlob);

const res = await fetch("/api/enhance-prompt", {
  method: "POST",
  body: formData,
});
const { prompt } = await res.json();
// → "Substitute the plain white t-shirt with a red plaid flannel shirt with a relaxed fit"
```

Set `OPENAI_API_KEY` in `.env.local` to enable it.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser                                         │
│                                                  │
│  ┌──────────┐    WebRTC    ┌──────────────────┐ │
│  │  Camera   │ ──────────► │  Decart SDK      │ │
│  │  stream   │             │  (lucy_2_rt)     │ │
│  └──────────┘             │                  │ │
│                            │  AI-transformed  │ │
│  ┌──────────┐    WebRTC    │  video stream    │ │
│  │  <video>  │ ◄────────── │                  │ │
│  │  output   │             └──────────────────┘ │
│  └──────────┘                      ▲            │
│       │                            │            │
│       │  setImage(blob, prompt)    │            │
│       └────────────────────────────┘            │
└──────────────────────┬──────────────────────────┘
                       │ fetch /api/tokens
                       │ fetch /api/enhance-prompt (optional)
                       ▼
┌─────────────────────────────────────────────────┐
│  Next.js API Routes (server-side)                │
│                                                  │
│  /api/tokens          → Decart SDK tokens.create │
│  /api/enhance-prompt  → OpenAI GPT-4o-mini       │
└─────────────────────────────────────────────────┘
```

Your permanent `DECART_API_KEY` never leaves the server. The browser receives a short-lived client token (`ek_...`) that expires after 10 minutes. Active WebRTC sessions continue working even after the token expires.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime WebRTC connections |
| `OPENAI_API_KEY` | No | Powers `/api/enhance-prompt` — auto-generates prompts from garment images |

---

## Next steps

- [Decart Quickstart](https://docs.platform.decart.ai/getting-started/quickstart) — Get your API key and first result in minutes
- [Client Tokens](https://docs.platform.decart.ai/getting-started/client-tokens) — Secure browser authentication for production
- [Lucy 2 Model Guide](https://docs.platform.decart.ai/models/realtime/lucy-2) — Character transformation, text editing, and reference images
- [JavaScript Realtime SDK](https://docs.platform.decart.ai/sdks/javascript-realtime) — Full WebRTC API reference
- [Use Cases](https://docs.platform.decart.ai/examples/use-cases) — More patterns: character transformation, live streaming, avatars

---

## License

MIT
