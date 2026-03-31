# Decart Virtual Try-On Examples

Virtual try-on lets shoppers see how clothing looks on them in real time, using just a webcam. Decart's `lucy_2_rt` model takes a live camera feed and a garment reference image, then streams back video of the person wearing that garment - all through a WebRTC connection with no server-side rendering. This repo provides drop-in examples so you can add try-on to your own app in minutes.

Seven production-ready Next.js examples that show how to integrate Decart's realtime virtual try-on. Each example is self-contained and runs independently.

| Example | Use case | Integration style |
|---------|----------|-------------------|
| [**E-commerce**](examples/ecommerce/) | "Try it on" button on product pages | Simple - hardcoded prompts, modal overlay |
| [**Standalone**](examples/standalone/) | Dedicated try-on experience | Advanced - AI-generated prompts via LLM |
| [**Person Detection**](examples/person-detection/) | Kiosks and unattended displays | Auto-connect - only uses credits when someone is in frame |
| [**Full-Featured**](examples/full-featured/) | Complete try-on experience | All features - person detection, AI prompts, file upload, clothing extraction, extreme precision |
| [**Digital Mirror**](examples/digital-mirror/) | In-store kiosk / smart mirror | Two-device - display + phone controller via QR code, portrait cropping, idle rotation |
| [**Outfit Builder**](examples/outfit-builder/) | Multi-garment styling | Composition - combine top + bottom garments, outfit prompt generation, fit validation |
| [**Batch Warmup**](examples/batch-warmup/) | Demos, presentations, showrooms | Pre-generation - batch FAL queue for instant try-on, cached gallery |

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

For garments where you don't have a pre-written prompt (e.g. user-uploaded images), you can use any vision LLM to auto-generate one from the garment image. The [standalone example](examples/standalone/) demonstrates this using OpenAI's GPT-4o-mini, but any vision-capable LLM works (Claude, Gemini, etc.). A built-in Decart solution for prompt generation is coming soon.

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

### Extracting clothing from model photos

When users upload photos from fashion websites where a model is wearing the garment, the image contains a person + background rather than a clean garment shot. You can use any image editing model to strip the person and background, leaving only the clothing item on a white background — ready for try-on.

The [full-featured example](examples/full-featured/) demonstrates this using FAL.AI's Flux Klein 4B with an extraction prompt, but any image editing model works. A built-in Decart solution is coming soon.

```typescript
const result = await fal.subscribe("fal-ai/flux-2/klein/4b/base/edit", {
  input: {
    prompt: "Extract only the clothing garment from this image...",
    image_urls: [imageUrl],
  },
});
```

The example also uses GPT-4o-mini to auto-detect whether the uploaded image contains a person, so extraction only runs when needed.

### Extreme precision for non-trivial items

For accessories, bags, hats, jewelry, or other items where the standard real-time model may struggle, you can add a pre-generation step that produces a photorealistic try-on image before sending it to Decart's real-time model. This gives the model a much clearer reference.

The [full-featured example](examples/full-featured/) demonstrates this using FAL.AI's Flux Klein 9B with a virtual try-on LoRA, but any image generation model works. A built-in Decart solution is coming soon.

```typescript
const result = await fal.subscribe("fal-ai/flux-2/klein/9b/base/edit/lora", {
  input: {
    prompt: "TRYON [person in photo]. Replace the outfit with [garment]...",
    image_urls: [personUrl, clothingUrl],
    loras: [{ path: LORA_URL, scale: 1.0 }],
    guidance_scale: 2.5,
    num_inference_steps: 28,
  },
});
```

The pipeline captures a snapshot from the camera, generates the precision image, then sends that to `setImage()` instead of the raw garment.

### Portrait cropping for vertical displays

When using a vertical/portrait display (common in digital mirrors and kiosks), webcams still output landscape video (1280×720). The [digital mirror example](examples/digital-mirror/) demonstrates how to crop the camera feed to portrait (720×1280) using an off-screen canvas before sending it to Decart, so the AI output matches the display orientation.

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
│  /api/extract-clothing→ FAL.AI Flux Klein 4B     │
│  /api/extreme-precision→ FAL.AI Flux Klein 9B    │
│  /api/outfit-prompt   → OpenAI GPT-4o-mini       │
│  /api/validate-fit    → OpenAI GPT-4o            │
│  /api/warmup/submit   → FAL.AI Nano Banana Pro   │
│  /api/warmup/result   → FAL.AI queue polling     │
└─────────────────────────────────────────────────┘
```

Your permanent `DECART_API_KEY` never leaves the server. The browser receives a short-lived client token (`ek_...`) that expires after 10 minutes. Active WebRTC sessions continue working even after the token expires.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime WebRTC connections |
| `OPENAI_API_KEY` | Standalone / Full-Featured / Outfit Builder / Batch Warmup | Powers `/api/enhance-prompt` - auto-generates prompts from garment images. Can be swapped for any vision-capable LLM. |
| `FAL_KEY` | Full-Featured (optional) / Batch Warmup | Powers clothing extraction, extreme precision, and batch warmup via FAL.AI. Can be swapped for any image editing/generation model. |

---

## Resources

- [Decart Quickstart](https://docs.platform.decart.ai/getting-started/quickstart) - Get your API key and first result in minutes
- [JavaScript Realtime SDK](https://docs.platform.decart.ai/sdks/javascript-realtime) - Full WebRTC API reference

---

## License

MIT
