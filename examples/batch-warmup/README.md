# Batch Warmup (pre-generate for instant try-on)

> Pre-generates try-on images for the entire product catalog the moment a stream connects, caching them for instant display when products are selected. Ideal for demos, presentations, or high-traffic kiosks where switching between products should feel instantaneous.

Unlike the [standalone example](../standalone/) which generates try-on results on demand (user clicks, then waits), this example generates all results proactively in the background using FAL.AI's queue API. When a user clicks a product, the cached image is applied instantly.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/batch-warmup
npm install
```

### 2. Set your API keys

```bash
cp .env.example .env.local
```

Open `.env.local` and add all three keys:

```env
DECART_API_KEY=sk_your_key_here
OPENAI_API_KEY=sk_your_openai_key_here
FAL_KEY=your_fal_key_here
```

> **Note:** All three keys are required. Decart powers the realtime try-on, OpenAI generates prompts, and FAL.AI generates the pre-rendered try-on images.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your camera starts automatically. Click **Start Warmup** to begin pre-generating try-on images for all products. As each completes, a green checkmark appears and the product thumbnail updates to show the try-on preview. Click any product to apply it instantly.

---

## How it works

```
Page loads → Camera starts → Connect to Decart (WebRTC)
  → User clicks "Start Warmup"
    → Capture person snapshot from camera
    → For each product (5 concurrent):
      1. Load garment image
      2. Generate prompt via GPT-4o-mini (/api/enhance-prompt)
      3. Submit garment + person to FAL queue (/api/warmup/submit)
    → Poll all queued items in parallel every 2s (/api/warmup/result)
    → Cache completed images in memory
    → Update UI progressively as each completes

  → User clicks a product
    → If cached: apply instantly (setImage with cached blob + prompt)
    → If not cached: fall back to live prompt generation
```

### The warmup pipeline

The `useWarmup` hook manages two phases:

**Phase 1 - Submit** (concurrent, limited to 5 at a time):
```typescript
for each product:
  clothingBlob = await urlToImageBlob(product.image)
  prompt = await enhancePrompt(clothingBlob, personFrame)
  requestId = await submitWarmup(clothingBlob, personSnapshot)
```

**Phase 2 - Poll** (all items polled in parallel every 2s):
```typescript
while (remaining items > 0):
  for each pending item:
    result = await pollWarmupResult(requestId)
    if (result.status === "COMPLETED"):
      cache.set(productId, { imageBlob: result.blob, prompt })
```

### FAL.AI queue API

The warmup uses FAL.AI's non-blocking queue API (Nano Banana Pro model):

- **`/api/warmup/submit`** - Uploads images to FAL storage, submits to `fal-ai/nano-banana-pro/edit` queue, returns a `requestId`
- **`/api/warmup/result`** - Checks queue status for a `requestId`. Returns JSON `{ status }` if still processing, or the generated image blob if completed

---

## Customization

### Add your own products

Edit `lib/products.ts`. Each product needs an id, name, image, and price. Optionally include a `prompt` to skip LLM generation during warmup:

```typescript
{
  id: "custom-jacket",
  name: "Custom Jacket",
  image: "/products/custom-jacket.png",
  price: 149,
  prompt: "Substitute the current top with a black leather jacket with silver zippers",
}
```

Products with a pre-written `prompt` field warm up faster since they skip the GPT-4o-mini call.

### Swap the image generation model

The warmup uses `fal-ai/nano-banana-pro/edit` by default. You can swap this for any image editing model in `app/api/warmup/submit/route.ts` and `app/api/warmup/result/route.ts`.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
| `OPENAI_API_KEY` | Yes | Powers `/api/enhance-prompt` for auto-generating prompts |
| `FAL_KEY` | Yes | Powers `/api/warmup/submit` and `/api/warmup/result` for batch image generation via FAL.AI |
