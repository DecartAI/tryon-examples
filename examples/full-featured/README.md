# Full-Featured Virtual Try-On

> Combines all features: person detection, AI-generated prompts, file upload, and a product catalog. The most complete integration example.

Auto-detects when a person is in the camera frame, generates try-on prompts with GPT-4o-mini, lets users upload their own garment images, and includes a product catalog sidebar — all in one app.


---

## Quick start

### 1. Install dependencies

```bash
cd examples/full-featured
npm install
```

### 2. Set your API keys

```bash
cp .env.example .env.local
```

Open `.env.local` and add both keys:

```env
DECART_API_KEY=sk_your_key_here
OPENAI_API_KEY=sk_your_openai_key_here
```

> **Note:** This example requires both keys. The Decart key powers the realtime try-on, and the OpenAI key powers the prompt generation.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your camera will start and MediaPipe will begin scanning. Step in front of the camera to trigger a connection, then click a product or upload your own garment.

---

## How it works

```
Page loads
  → Camera starts automatically (getUserMedia)
    → MediaPipe PoseLandmarker loads (WASM + WebGL, runs in browser)
      → Every 1s: detectForVideo() checks for body landmarks
        → Person detected (landmarks found)
          → Fetch client token from /api/tokens
            → Connect to Decart's lucy_2_rt model (WebRTC)
              → User clicks a product OR uploads a garment image
                → Capture a frame from the camera
                → Send garment image + person frame to /api/enhance-prompt
                → GPT-4o-mini generates a try-on prompt
                → setImage(garment, prompt) sends the garment to the model
                  → AI video stream shows the user wearing the garment
        → Person leaves (3 consecutive misses, ~3s)
          → Disconnect from Decart (stops billing)
            → Person returns → fresh token → reconnect → re-apply last garment
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Person detection** | Auto-connects when someone is in frame, disconnects when they leave (saves credits) |
| **AI-generated prompts** | GPT-4o-mini generates descriptive try-on prompts from the garment image + camera frame |
| **File upload** | Users can upload their own garment images and get AI-generated prompts automatically |
| **Product catalog** | Sidebar with product grid, click to try on |
| **Editable prompts** | View and edit the generated prompt, re-apply with one click |
| **Auto-reconnect** | When a person leaves and returns, the last garment is automatically re-applied |

---

## Key files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main orchestration — detection-driven connect/disconnect with AI prompt generation |
| `components/CombinedView.tsx` | Video display with detection status badges, processing overlay, and prompt editor |
| `components/ProductSidebar.tsx` | Product grid with file upload section |
| `hooks/usePersonDetection.ts` | MediaPipe PoseLandmarker polling, exposes `personPresent` state |
| `hooks/useDecartRealtime.ts` | Decart WebRTC connection management |
| `hooks/useCamera.ts` | Camera access via getUserMedia |
| `lib/enhance-prompt.ts` | Client-side helper for calling `/api/enhance-prompt` |
| `app/api/enhance-prompt/route.ts` | Server-side GPT-4o-mini prompt generation |
| `app/api/tokens/route.ts` | Server-side Decart client token creation |

---

## Customization

### Tuning detection sensitivity

In `hooks/usePersonDetection.ts`:

- **`DETECTION_INTERVAL_MS`** (default: 1000) — how often to check for a person
- **`MISS_THRESHOLD`** (default: 3) — consecutive missed detections before disconnecting

### Add your own products

Edit `lib/products.ts`. Each product just needs a name, image path, and price — prompts are generated automatically:

```typescript
{
  name: "Striped Polo",
  image: "/products/striped-polo.jpg",
  price: 45,
}
```

Place the garment image in `public/products/`.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime WebRTC connections |
| `OPENAI_API_KEY` | Yes | Powers `/api/enhance-prompt` for auto-generating prompts |
