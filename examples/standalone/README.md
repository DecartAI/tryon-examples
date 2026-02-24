# Standalone Virtual Try-On

A dedicated try-on experience. Products on the left, live camera + AI output in the center. Drag a product onto the video to try it on.

## Quick start

```bash
cd examples/standalone
npm install
cp .env.example .env.local   # Set your DECART_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. Camera starts automatically on page load
2. App connects to Decart's `lucy_2_rt` model
3. User drags a product from the sidebar onto the video
4. `setImage()` sends the garment + prompt to the model
5. AI stream updates to show the user wearing the garment
6. Drag another product to switch instantly

## Code walkthrough

| File | Purpose |
|------|---------|
| `app/page.tsx` | Full-page layout with DndContext, camera + Decart init |
| `components/ProductSidebar.tsx` | Product grid with draggable cards |
| `components/DraggableProduct.tsx` | Product card wrapped with `@dnd-kit` `useDraggable` |
| `components/TryOnView.tsx` | Camera feed + AI overlay + drop zone |
| `hooks/useCamera.ts` | `getUserMedia` wrapper with cleanup |
| `hooks/useDecartRealtime.ts` | Decart SDK connection lifecycle |
| `lib/products.ts` | 6 products with pre-written prompts |
| `lib/image-utils.ts` | `urlToImageBlob`, `resizeImageBlob`, `loadImage` |
| `app/api/tokens/route.ts` | Creates ephemeral Decart tokens (server-side) |
| `app/api/enhance-prompt/route.ts` | GPT-4o-mini prompt generation (optional) |

## Key dependency

This example uses [`@dnd-kit/core`](https://dndkit.com/) for drag-and-drop. The drag-and-drop flow:

- `DraggableProduct` uses `useDraggable` to make each product card draggable
- `TryOnView` uses `useDroppable` to create the drop zone over the video
- `page.tsx` handles `onDragEnd` to call `setImage()` with the dropped product

## Customization

### Add your own products

Edit `lib/products.ts`. Each product needs:

```ts
{
  name: "Your Product",
  image: "/products/your-product.jpg",  // Place in public/products/
  prompt: "Substitute the current top with ...",
  price: 99,
}
```

### Use enhance-prompt for dynamic images

If you accept user-uploaded garments, use the enhance-prompt API instead of hardcoded prompts:

```ts
const formData = new FormData();
formData.append("image", garmentBlob);

const res = await fetch("/api/enhance-prompt", { method: "POST", body: formData });
const { prompt } = await res.json();
```

Requires `OPENAI_API_KEY` in `.env.local`.
