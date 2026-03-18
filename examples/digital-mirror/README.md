# Digital Mirror — Two-Device Virtual Try-On

A digital mirror setup where a **display screen** shows the camera feed + AI output with a QR code, and a **phone** scans the QR to browse and select products. The display only connects to Decart when a phone is active, so no credits are used while idle.

Only requires `DECART_API_KEY` — no OpenAI, no database, no external services.

## Quick start

```bash
cd examples/digital-mirror
npm install

# Set your API key
export DECART_API_KEY="your-api-key-here"

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on the display screen. Scan the QR code with your phone (or open `/remote/XXXXXX` in another browser tab).

## How it works

```
┌─────────────────────────────────┐     ┌──────────────────────┐
│  Display (/)                    │     │  Phone (/remote/XXX) │
│                                 │     │                      │
│  1. Start camera                │     │  3. Scan QR code     │
│  2. Create session → QR code    │     │  4. Claim session    │
│  5. Poll /api/mirror/poll ◄─────┼─────┤  6. Browse products  │
│  7. Phone connects → fetch token│     │  7. Tap product      │
│  8. Connect Decart realtime     │     │     → POST /select   │
│  9. Get selection → setImage()  │     │  8. Heartbeat /ping  │
│ 10. Show AI try-on video        │     │  9. Done → /release  │
│ 11. Phone leaves → disconnect   │     │                      │
└─────────────────────────────────┘     └──────────────────────┘
```

**Session lifecycle:**
1. Display creates a session and renders a QR code pointing to `/remote/{sessionId}`
2. Phone scans QR, validates the session, and claims control
3. Display detects the controller via polling and connects to Decart
4. Phone sends product selections; display polls and calls `setImage()` for each
5. Phone sends heartbeat pings every 5s; if pings stop for 10s, session is released
6. Phone taps "Done" or navigates away → controller released → Decart disconnected

All session state is stored in-memory on the server (no database needed). Sessions expire after 30 minutes of inactivity.

## Portrait cropping for vertical screens

Digital mirrors typically use portrait-oriented displays (vertical screens), but webcams output landscape video (1280×720). This example includes a **portrait cropping hook** that transforms the camera feed before sending it to Decart.

### Why

The Decart realtime model processes whatever resolution you send it. If you send landscape 1280×720 to a portrait display, you either get black bars or a stretched image. By cropping to portrait (720×1280) on the client side, the model's output matches the display orientation.

### How it works

The `usePortraitStream` hook:

1. Creates an off-screen `<canvas>` at 720×1280 (portrait)
2. Creates a hidden `<video>` element playing the camera stream
3. Uses `requestAnimationFrame` at 20fps to draw a center-cropped frame from the video onto the canvas
4. Calls `canvas.captureStream(20)` to produce a new `MediaStream`
5. This portrait stream is sent to Decart instead of the raw camera stream

### The math

```
Camera: 1280×720 (landscape, aspect ratio 1.78)
Output: 720×1280 (portrait, aspect ratio 0.5625)

Since camera aspect (1.78) > output aspect (0.5625):
  → Camera is wider than needed → crop the sides

  cropH = 720 (full height)
  cropW = 720 × (720/1280) = 405
  cropX = (1280 - 405) / 2 = 437  (center horizontally)
  cropY = 0

Result: A 405×720 center strip from the camera, scaled to 720×1280
```

### Skip portrait cropping

Add `?landscape` to the mirror URL to skip cropping and send the raw camera stream:

```
http://localhost:3000?landscape
```

## Query parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `?flip=false` | `true` (mirrored) | Disable horizontal flip |
| `?landscape` | portrait crop | Skip portrait cropping, send raw landscape stream |

## Customization

### Adding products

Edit `lib/products.ts` — each product needs an `id`, `name`, `image` path, and a `prompt`. The prompt is sent directly to the Decart model with `enhance: false`, so write detailed prompts for best results.

## Advanced

This example is intentionally simplified to focus on the two-device mirror pattern. Here are things you'd want to add for a production deployment.

### Database-backed sessions

Session state is stored in-memory (`lib/mirror-store.ts`), which means it resets on server restart and doesn't work across multiple server instances. For production, swap the in-memory Maps with a real database — Postgres (e.g. Neon), Redis, or any key-value store. The interface is minimal (`createSession`, `claimController`, `setSelection`, etc.) so the migration is straightforward. See the [tryonv1 repo](https://github.com/DecartAI/tryonv1) for a Neon Postgres implementation with the same session/controller/selection schema.

### Image uploads and custom prompts

The phone controller only shows the product grid. A production version could allow users to upload their own garment photos or enter free-text style prompts. This requires an image upload endpoint (e.g. to S3 or Vercel Blob) and extended selection types beyond simple product IDs.

### Recording and sharing

A production mirror could capture snapshots or short video clips of the try-on result and let users share them via email, SMS, or QR code. This involves capturing frames from the remote video stream and storing them for later retrieval.
