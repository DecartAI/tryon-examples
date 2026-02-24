# Standalone Virtual Try-On

> A dedicated try-on experience — products on the left, live camera in the center. Drag a product onto the video to try it on.

This example shows how to build a full-page virtual try-on app with Decart. The camera connects automatically on page load, and users drag garments from a sidebar onto the live video to see themselves wearing each item in real-time.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/standalone
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

Open [http://localhost:3000](http://localhost:3000). Your camera will start automatically. Drag any product from the left sidebar onto the video to try it on.

---

## How it works

```
Page loads
  → Camera starts automatically (getUserMedia)
    → Fetch client token from /api/tokens
      → Connect to Decart's lucy_2_rt model (WebRTC)
        → User sees themselves in the live video feed
          → User drags a product onto the video (drop zone)
            → setImage(garment, prompt) sends the garment to the model
              → AI video stream shows the user wearing the garment
                → Drag another product to switch instantly
```

The page layout is simple — a sidebar + video area, wrapped in a `DndContext`:

```typescript
// app/page.tsx
<DndContext onDragEnd={handleDragEnd}>
  <div className="h-screen flex">
    <ProductSidebar activeProduct={activeProduct} />
    <TryOnView
      localStream={stream}
      status={status}
      error={error}
      onRemoteStream={handleRemoteStreamRef}
    />
  </div>
</DndContext>
```

When a product is dropped on the video:

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  if (!event.over || !event.active.data.current) return;
  const product = event.active.data.current as Product;

  // Load and resize the garment image
  const blob = await urlToImageBlob(product.image);
  const resized = await resizeImageBlob(blob);

  // Apply the garment — no reconnection needed
  clientRef.current.setImage(resized, {
    prompt: product.prompt,
    enhance: false,
  });
};
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

#### `components/ProductSidebar.tsx` — Draggable product grid

Renders a scrollable sidebar with a grid of `DraggableProduct` cards. Highlights the currently active product.

#### `components/DraggableProduct.tsx` — Draggable product card

Wraps each product card with [`@dnd-kit`](https://dndkit.com/)'s `useDraggable` hook:

```typescript
const { attributes, listeners, setNodeRef, transform, isDragging } =
  useDraggable({ id: product.name, data: product });
```

- The product data is attached via `data: product` so the drop handler can access it
- Visual feedback: opacity change while dragging, border highlight when active

#### `components/TryOnView.tsx` — Camera + AI output + drop zone

The central video area that serves three purposes:

1. **Local camera feed** — shown at full opacity before any garment is applied, faded when the AI stream is active
2. **Remote AI stream** — the Decart-transformed video, shown when `status === "generating"`
3. **Drop zone** — uses `@dnd-kit`'s `useDroppable` to accept dragged products

```typescript
const { setNodeRef, isOver } = useDroppable({ id: "tryon-drop-zone" });
```

When a product is dragged over the video, a blue overlay appears with "Drop to try on". Connection status is displayed in the top-left corner.

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

## Drag-and-drop integration

This example uses [`@dnd-kit/core`](https://dndkit.com/) for drag-and-drop. Here's how the pieces connect:

```
┌─ ProductSidebar ──────────┐     ┌─ TryOnView ─────────────┐
│                            │     │                          │
│  ┌─ DraggableProduct ──┐  │     │   useDroppable()         │
│  │  useDraggable()      │  │     │   id: "tryon-drop-zone"  │
│  │  id: product.name    │──┼────►│                          │
│  │  data: product       │  │     │   ┌─────────────────┐    │
│  └──────────────────────┘  │     │   │  <video> output  │    │
│                            │     │   └─────────────────┘    │
│  ┌─ DraggableProduct ──┐  │     │                          │
│  │  ...                 │  │     └──────────────────────────┘
│  └──────────────────────┘  │
└────────────────────────────┘

DndContext.onDragEnd → product.data → setImage(blob, prompt)
```

**Key files:**

1. `app/page.tsx` — wraps everything in `<DndContext>`, handles `onDragEnd`
2. `components/DraggableProduct.tsx` — makes each card draggable, attaches product data
3. `components/TryOnView.tsx` — creates the drop zone over the video area

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
clientRef.current.setImage(resizedBlob, { prompt, enhance: false });
```

### Adapt to your stack

This example uses Next.js + Tailwind + @dnd-kit, but the core integration is framework-agnostic. The key files to port:

1. **`app/api/tokens/route.ts`** — adapt to your backend (Express, Fastify, etc.)
2. **`hooks/useDecartRealtime.ts`** — works in any React app as-is
3. **`hooks/useCamera.ts`** — works in any React app as-is
4. **Drag-and-drop** — swap `@dnd-kit` for `react-beautiful-dnd`, HTML drag-and-drop API, or any library

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
| `OPENAI_API_KEY` | No | Powers `/api/enhance-prompt` for auto-generating prompts |
