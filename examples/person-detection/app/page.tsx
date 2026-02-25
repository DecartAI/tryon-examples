"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { usePersonDetection } from "@/hooks/usePersonDetection";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";
import { enhancePrompt } from "@/lib/enhance-prompt";
import { ProductSidebar } from "@/components/ProductSidebar";
import { PersonDetectionView } from "@/components/PersonDetectionView";

export default function PersonDetectionPage() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();

  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localVideoElement, setLocalVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const garmentBlobRef = useRef<Blob | null>(null);
  const lastProductRef = useRef<Product | null>(null);
  const connectingRef = useRef(false);

  const { personPresent, isReady: detectionReady } =
    usePersonDetection(localVideoElement);

  const handleRemoteStreamRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      remoteVideoRef.current = ref;
    },
    []
  );

  const handleLocalVideoRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      localVideoRef.current = ref.current;
      setLocalVideoElement(ref.current);
    },
    []
  );

  // Start camera on mount (detection runs on the camera feed, Decart connects later)
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Connect/disconnect based on person detection
  useEffect(() => {
    if (!detectionReady || !stream) return;

    if (personPresent && !clientRef.current && !connectingRef.current) {
      // Person detected → connect to Decart
      connectingRef.current = true;

      (async () => {
        const res = await fetch("/api/tokens", { method: "POST" });
        const { apiKey } = await res.json();

        const rtClient = await connect({
          apiKey,
          stream,
          onRemoteStream: (remoteStream) => {
            if (remoteVideoRef.current?.current) {
              remoteVideoRef.current.current.srcObject = remoteStream;
            }
          },
        });

        connectingRef.current = false;

        // Re-apply last garment if reconnecting
        if (rtClient && lastProductRef.current && garmentBlobRef.current) {
          const generatedPrompt = await enhancePrompt(
            garmentBlobRef.current,
            localVideoRef.current
          );
          const finalPrompt = generatedPrompt || "Try on this garment";
          setPrompt(finalPrompt);
          rtClient.setImage(garmentBlobRef.current, {
            prompt: finalPrompt,
            enhance: false,
          });
        }
      })();
    } else if (!personPresent && clientRef.current && !connectingRef.current) {
      // No person → disconnect
      disconnect();
    }
  }, [personPresent, detectionReady, stream, connect, disconnect, clientRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      setActiveProduct(product);
      lastProductRef.current = product;

      if (!clientRef.current) return;

      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;

      setProcessingStatus("Generating try-on prompt...");
      const generatedPrompt = await enhancePrompt(
        resized,
        localVideoRef.current
      );
      setProcessingStatus(null);

      const finalPrompt = generatedPrompt || "Try on this garment";
      setPrompt(finalPrompt);
      clientRef.current.setImage(resized, {
        prompt: finalPrompt,
        enhance: false,
      });
    },
    [clientRef]
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
      <PersonDetectionView
        localStream={stream}
        status={status}
        error={error}
        prompt={prompt}
        processingStatus={processingStatus}
        personPresent={personPresent}
        detectionReady={detectionReady}
        onPromptChange={setPrompt}
        onPromptSubmit={handlePromptSubmit}
        onRemoteStream={handleRemoteStreamRef}
        onLocalVideo={handleLocalVideoRef}
      />
    </div>
  );
}
