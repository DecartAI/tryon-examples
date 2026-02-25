# Decart Virtual Try-On Examples

Virtual try-on lets shoppers see how clothing looks on them in real time, using just a webcam. Decart's `lucy_2_rt` model takes a live camera feed and a garment reference image, then streams back video of the person wearing that garment - all through a WebRTC connection with no server-side rendering. This repo provides drop-in examples so you can add try-on to your own app in minutes.

Three production-ready Next.js examples that show how to integrate Decart's realtime virtual try-on. Each example is self-contained and runs independently.

| Example | Use case | Integration style |
|---------|----------|-------------------|
| [**E-commerce**](examples/ecommerce/) | "Try it on" button on product pages | Simple - hardcoded prompts, modal overlay |
| [**Standalone**](examples/standalone/) | Dedicated try-on experience | Advanced - AI-generated prompts via LLM |
| [**Person Detection**](examples/person-detection/) | Kiosks and unattended displays | Auto-connect when a person is in frame via MediaPipe |

---

## Prerequisites

- A Decart account at [platform.decart.ai](https://platform.decart.ai)
- A [Decart API key](https://docs.platform.decart.ai/getting-started/authentication)
- Node.js 18+

```bash
export DECART_API_KEY="your-api-key-here"
```

> **Note:** All examples use [client tokens](https://docs.platform.decart.ai/getting-started/client-tokens) - your permanent API key stays on the server, and the browser only receives a short-lived ephemeral token.

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

Call `setImage()` again at any time to switch garments - no need to reconnect.

---

## Best practices

### For best results: clean image + good prompt

The ideal setup is a **clean garment image** paired with a **descriptive prompt** - like the [e-commerce example](examples/ecommerce/) does. This gives the model the clearest signal of what to apply.

**Reference images:**

- **Clean garment images work best** - just the clothing item, no person wearing it
- **White or clean backgrounds** are ideal
- **At least 512x512 pixels** - the model reproduces what it sees, so clear garment = better results
- If your source image shows a person wearing the garment, consider using an image editing model to extract just the clothing item

**Prompt structure:**

The model works best with structured prompts that follow a **substitute** or **add** pattern:

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Substitute** | Replacing an existing garment | `"Substitute the current top with a red plaid flannel shirt with a relaxed fit"` |
| **Add** | Adding something the person isn't wearing | `"Add a wide-brimmed straw hat to the person's head"` |

Be specific - include color, material, texture, pattern, and fit. Aim for 20-30 words. Use generic references when you don't know the current outfit: `"the current top"`, `"the current bottoms"`.

```
✅ "Substitute the current top with a bright red hoodie with an oversized casual fit"
✅ "Substitute the current top with a black leather bomber jacket with ribbed cuffs"
✅ "Add a navy baseball cap to the person's head"

❌ "Put a jacket on the person"        (too vague - no color, material, or fit)
❌ "Red hoodie"                         (missing action and context)
```

### Built-in enhance prompt

The Decart model has a built-in `enhance` option that can improve short or vague prompts automatically. Set `enhance: true` in the `setImage()` call and the model will expand your prompt internally. We are also working on a dedicated enhance API specifically optimized for try-on prompts.

```typescript
await rtClient.setImage(garmentBlob, {
  prompt: "Red hoodie",
  enhance: true, // Model will expand this into a more descriptive prompt
});
```

This is a good fallback, but for the best results we still recommend writing detailed prompts yourself (as shown above) or generating them with an LLM.

### Generating prompts with an LLM

For garments where you don't have a pre-written prompt (e.g. user-uploaded images), you can use any vision LLM to auto-generate one from the garment image. The [standalone example](examples/standalone/) demonstrates this using OpenAI's GPT-4o-mini, but any vision-capable LLM works.

The example sends both the garment image and a camera frame of the person to `/api/enhance-prompt`:

```typescript
const formData = new FormData();
formData.append("image", garmentBlob);
formData.append("personFrame", cameraFrameBlob); // optional, improves accuracy

const res = await fetch("/api/enhance-prompt", {
  method: "POST",
  body: formData,
});
const { prompt } = await res.json();
// → "Substitute the grey crewneck sweater with a blue and pink flame print hoodie with an oversized fit"
```

The person frame gives the LLM context about what the person is currently wearing, so it generates more accurate prompts (e.g. "Substitute the grey sweater" instead of generic "Substitute the current top").

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
| `OPENAI_API_KEY` | Standalone & Person Detection | Powers `/api/enhance-prompt` - auto-generates prompts from garment images |

---

## Resources

- [Decart Quickstart](https://docs.platform.decart.ai/getting-started/quickstart) - Get your API key and first result in minutes
- [JavaScript Realtime SDK](https://docs.platform.decart.ai/sdks/javascript-realtime) - Full WebRTC API reference

---

## License

MIT
