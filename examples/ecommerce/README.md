# E-commerce Virtual Try-On

Add a "Try it on" button to your product pages. Clicking opens a modal with the user's camera and real-time AI try-on.

## Quick start

```bash
cd examples/ecommerce
npm install
cp .env.example .env.local   # Set your DECART_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. User clicks "Try On" on a product card
2. Modal opens, requests camera access
3. App fetches an ephemeral Decart token from `/api/tokens`
4. Connects camera stream to Decart's `lucy_2_rt` model
5. Sends garment image + prompt via `setImage()`
6. AI video stream shows the user wearing the garment in real-time

## Code walkthrough

| File | Purpose |
|------|---------|
| `app/page.tsx` | Product grid, manages selected product state |
| `components/ProductCard.tsx` | Product card with image, price, "Try On" button |
| `components/TryOnModal.tsx` | Modal: starts camera, connects Decart, sends garment |
| `hooks/useCamera.ts` | `getUserMedia` wrapper with cleanup |
| `hooks/useDecartRealtime.ts` | Decart SDK connection lifecycle |
| `lib/products.ts` | 6 products with pre-written prompts |
| `lib/image-utils.ts` | `urlToImageBlob`, `resizeImageBlob`, `loadImage` |
| `app/api/tokens/route.ts` | Creates ephemeral Decart tokens (server-side) |
| `app/api/enhance-prompt/route.ts` | GPT-4o-mini prompt generation (optional) |

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
