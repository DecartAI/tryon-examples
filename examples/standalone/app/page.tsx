"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";
import { ProductSidebar } from "@/components/ProductSidebar";
import { TryOnView } from "@/components/TryOnView";

export default function StandalonePage() {
  const searchParams = useSearchParams();
  const enhanceEnabled = searchParams.get("enhance") === "true";

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();
  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const garmentBlobRef = useRef<Blob | null>(null);

  const handleRemoteStreamRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      remoteVideoRef.current = ref;
    },
    []
  );

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

      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;

      let finalPrompt = product.prompt;

      if (enhanceEnabled) {
        setProcessingStatus("Generating try-on prompt...");
        try {
          const formData = new FormData();
          formData.append("image", resized);
          const res = await fetch("/api/enhance-prompt", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.prompt) {
            finalPrompt = data.prompt;
          }
        } catch {
          // Fall back to hardcoded prompt
        }
        setProcessingStatus(null);
      }

      setPrompt(finalPrompt);
      clientRef.current.setImage(resized, {
        prompt: finalPrompt,
        enhance: false,
      });
    },
    [clientRef, enhanceEnabled]
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
      <ProductSidebar
        activeProduct={activeProduct}
        onSelectProduct={handleSelectProduct}
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
      />
    </div>
  );
}
