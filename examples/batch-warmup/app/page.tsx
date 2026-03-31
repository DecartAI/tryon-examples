"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Product, PRODUCTS } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { useWarmup } from "@/hooks/useWarmup";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";
import { enhancePrompt } from "@/lib/enhance-prompt";
import { WarmupGallery } from "@/components/WarmupGallery";
import { TryOnView } from "@/components/TryOnView";

export default function BatchWarmupPage() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();
  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const garmentBlobRef = useRef<Blob | null>(null);

  const {
    startWarmup,
    cancelWarmup,
    getFromCache,
    progress: warmupProgress,
    status: warmupStatus,
  } = useWarmup({
    products: PRODUCTS,
    localVideoRef,
  });

  const handleRemoteStreamRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      remoteVideoRef.current = ref;
    },
    []
  );

  const handleLocalVideoRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      localVideoRef.current = ref.current;
    },
    []
  );

  // Connect camera + Decart on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const mediaStream = await startCamera();
      if (!mediaStream || cancelled) return;

      const res = await fetch("/api/tokens", { method: "POST" });
      const { apiKey } = await res.json();
      if (cancelled) return;

      await connect({
        apiKey,
        stream: mediaStream,
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current?.current) {
            remoteVideoRef.current.current.srcObject = remoteStream;
          }
        },
      });
    }

    init();

    return () => {
      cancelled = true;
      disconnect();
      stopCamera();
    };
  }, [startCamera, stopCamera, connect, disconnect]);

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      setActiveProduct(product);

      if (!clientRef.current) return;

      // Check warmup cache first for instant application
      const cached = getFromCache(product.id);
      if (cached) {
        setPrompt(cached.prompt);
        garmentBlobRef.current = cached.imageBlob;
        clientRef.current.setImage(cached.imageBlob, {
          prompt: cached.prompt,
          enhance: false,
        });
        return;
      }

      // Fallback: generate prompt and apply live
      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;

      setProcessingStatus("Generating try-on prompt...");
      const generatedPrompt =
        product.prompt ||
        (await enhancePrompt(resized, localVideoRef.current));
      setProcessingStatus(null);

      const finalPrompt = generatedPrompt || "Try on this garment";
      setPrompt(finalPrompt);
      clientRef.current.setImage(resized, {
        prompt: finalPrompt,
        enhance: false,
      });
    },
    [clientRef, getFromCache]
  );

  const handlePromptSubmit = useCallback(() => {
    if (!clientRef.current || !garmentBlobRef.current) return;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt,
      enhance: false,
    });
  }, [clientRef, prompt]);

  return (
    <div className="h-screen flex">
      <WarmupGallery
        activeProduct={activeProduct}
        warmupStatus={warmupStatus}
        warmupProgress={warmupProgress}
        getFromCache={getFromCache}
        onSelectProduct={handleSelectProduct}
        onStartWarmup={startWarmup}
        onCancelWarmup={cancelWarmup}
      />
      <TryOnView
        localStream={stream}
        status={status}
        error={error}
        prompt={prompt}
        processingStatus={processingStatus}
        onPromptChange={setPrompt}
        onPromptSubmit={handlePromptSubmit}
        onRemoteStream={handleRemoteStreamRef}
        onLocalVideo={handleLocalVideoRef}
      />
    </div>
  );
}
