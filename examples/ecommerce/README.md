# E-commerce Virtual Try-On

> Add a "Try it on" button to any product page — opens a modal with the user's camera and real-time AI try-on.

This example shows the simplest way to integrate Decart virtual try-on into an existing e-commerce flow. Users browse a product grid, click "Try On", and see themselves wearing the garment in real-time through their camera.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/ecommerce
npm install
```

### 2. Set your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Decart API key:

```env
DECART_API_KEY=sk_your_key_here
```

> **Tip:** Get your API key from [platform.decart.ai](https://platform.decart.ai). See the [Authentication guide](https://docs.platform.decart.ai/getting-started/authentication) for details.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see a grid of 6 products. Click "Try On" on any product to open the try-on modal.

---

## How it works

```
User clicks "Try On"
  → Modal opens
    → Camera starts (getUserMedia)
      → Fetch client token from /api/tokens
        → Connect to Decart's lucy_2_rt model (WebRTC)
          → Send garment image + prompt via setImage()
            → AI video stream shows the user wearing the garment
              → User closes modal → camera stops, connection disconnects
```

The entire flow happens in `TryOnModal.tsx`:

```typescript
// 1. Start the camera
const mediaStream = await startCamera();

// 2. Get a short-lived client token
const res = await fetch("/api/tokens", { method: "POST" });
const { apiKey } = await res.json();

// 3. Connect to Decart
const rtClient = await connect({
  apiKey,
  stream: mediaStream,
  prompt: product.prompt,
  onRemoteStream: handleRemoteStream,
});

// 4. Send the garment image
const blob = await urlToImageBlob(product.image);
const resized = await resizeImageBlob(blob);
rtClient.setImage(resized, {
  prompt: product.prompt,
  enhance: false,
});
```

---

## Code walkthrough

### API routes

#### `app/api/tokens/route.ts` — Client token endpoint

Creates a short-lived Decart client token on the server. The browser never sees your permanent API key.

```typescript
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

#### `app/api/enhance-prompt/route.ts` — AI prompt generation (optional)

Uses GPT-4o-mini vision to analyze a garment image and generate a well-structured try-on prompt. Useful when you accept user-uploaded images and don't have a pre-written prompt.

Requires `OPENAI_API_KEY` in `.env.local`.

### Hooks

#### `hooks/useCamera.ts` — Camera access

Wraps `getUserMedia` with state management and cleanup:

```typescript
const { stream, error, startCamera, stopCamera } = useCamera();
```

- `startCamera()` — requests camera, returns `MediaStream`
- `stopCamera()` — stops all tracks, releases camera
- Cleanup is automatic on unmount

#### `hooks/useDecartRealtime.ts` — Decart connection lifecycle

Manages the full WebRTC connection to Decart:

```typescript
const { status, error, connect, disconnect, clientRef } = useDecartRealtime();
```

- `connect(options)` — creates a Decart client, connects via WebRTC, returns the realtime client
- `disconnect()` — tears down the connection
- `status` — tracks connection state: `idle` → `connecting` → `connected` → `generating`
- `clientRef.current` — direct access to the realtime client for calling `setImage()`

**Connection states:**

| Status | Meaning |
|--------|---------|
| `idle` | Not yet connected |
| `connecting` | WebRTC handshake in progress |
| `connected` | Connected, ready to receive garments |
| `generating` | Actively transforming video |
| `reconnecting` | Automatic reconnect after a drop |
| `error` | Connection failed (see `error` for details) |

### Components

#### `components/ProductCard.tsx` — Product display

Renders a product card with image, name, price, and a "Try On" button. The button calls `onTryOn()` to open the modal.

#### `components/TryOnModal.tsx` — Core try-on experience

The main component. On mount, it:

1. Starts the camera via `useCamera()`
2. Fetches a client token from `/api/tokens`
3. Connects to Decart via `useDecartRealtime()`
4. Converts the product image to a blob and sends it with `setImage()`
5. Displays the AI-transformed stream in a `<video>` element
6. Shows connection status and a "Live" indicator when generating

On close, it disconnects from Decart and stops the camera.

### Lib

#### `lib/products.ts` — Product catalog

6 products with pre-written prompts optimized for `lucy_2_rt`:

```typescript
export interface Product {
  name: string;
  image: string;    // Path to garment image in public/products/
  prompt: string;   // Structured prompt for setImage()
  price: number;
}
```

#### `lib/image-utils.ts` — Image processing

Three utility functions:

| Function | Purpose |
|----------|---------|
| `urlToImageBlob(url)` | Converts an image URL to a JPEG blob (renders via canvas, handles SVG/PNG transparency) |
| `resizeImageBlob(blob, maxSize)` | Downscales a blob so the longest side is at most `maxSize` px (default 1024) |
| `loadImage(blob)` | Loads a blob into an `HTMLImageElement` (used internally) |

---

## Customization

### Add your own products

Edit `lib/products.ts`. Each product needs a name, image path, prompt, and price:

```typescript
{
  name: "Striped Polo",
  image: "/products/striped-polo.jpg",
  prompt: "Substitute the current top with a navy and white striped polo shirt with a slim fit",
  price: 45,
}
```

Place the garment image in `public/products/`. Use a clean image of just the garment on a white background for best results.

### Use enhance-prompt for user-uploaded images

If your app accepts user-uploaded garment images, use the enhance-prompt API instead of hardcoded prompts:

```typescript
// Convert the uploaded file to a prompt
const formData = new FormData();
formData.append("image", userUploadedFile);

const res = await fetch("/api/enhance-prompt", {
  method: "POST",
  body: formData,
});
const { prompt } = await res.json();

// Use the generated prompt with setImage()
rtClient.setImage(resizedBlob, { prompt, enhance: false });
```

### Adapt to your stack

This example uses Next.js + Tailwind, but the core integration (hooks + API routes) works with any React framework. The key files to port:

1. **`app/api/tokens/route.ts`** — adapt to your backend (Express, Fastify, etc.)
2. **`hooks/useDecartRealtime.ts`** — works in any React app as-is
3. **`hooks/useCamera.ts`** — works in any React app as-is

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
| `OPENAI_API_KEY` | No | Powers `/api/enhance-prompt` for auto-generating prompts |
