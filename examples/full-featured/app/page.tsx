"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { usePersonDetection } from "@/hooks/usePersonDetection";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";
import { enhancePrompt } from "@/lib/enhance-prompt";
import { ProductSidebar } from "@/components/ProductSidebar";
import { CombinedView } from "@/components/CombinedView";

export default function FullFeaturedPage() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploadActive, setIsUploadActive] = useState(false);

  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();

  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const [localVideoElement, setLocalVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const garmentBlobRef = useRef<Blob | null>(null);
  const lastPromptRef = useRef<string>("");
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
      setLocalVideoElement(ref.current);
      localVideoRef.current = ref.current;
    },
    []
  );

  // Start camera on mount
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
        if (rtClient && garmentBlobRef.current && lastPromptRef.current) {
          rtClient.setImage(garmentBlobRef.current, {
            prompt: lastPromptRef.current,
            enhance: false,
          });
        }
      })();
    } else if (!personPresent && clientRef.current && !connectingRef.current) {
      disconnect();
    }
  }, [personPresent, detectionReady, stream, connect, disconnect, clientRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Apply garment blob + generate prompt (shared by product select and upload)
  const applyGarment = useCallback(
    async (blob: Blob, label: string) => {
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;

      if (!clientRef.current) return;

      setProcessingStatus(`Generating try-on prompt for ${label}...`);
      const generatedPrompt = await enhancePrompt(
        resized,
        localVideoRef.current
      );
      setProcessingStatus(null);

      const finalPrompt = generatedPrompt || "Try on this garment";
      setPrompt(finalPrompt);
      lastPromptRef.current = finalPrompt;

      clientRef.current.setImage(resized, {
        prompt: finalPrompt,
        enhance: false,
      });
    },
    [clientRef]
  );

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      setActiveProduct(product);
      setIsUploadActive(false);

      const blob = await urlToImageBlob(product.image);
      await applyGarment(blob, product.name);
    },
    [applyGarment]
  );

  const handleUploadGarment = useCallback(
    async (file: File) => {
      if (file.size === 0) return;

      // Revoke previous preview URL
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage);
      }

      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(previewUrl);
      setIsUploadActive(true);
      setActiveProduct(null);

      await applyGarment(file, "your upload");
    },
    [applyGarment, uploadedImage]
  );

  const handleClearUpload = useCallback(() => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setIsUploadActive(false);
  }, [uploadedImage]);

  const handlePromptSubmit = useCallback(() => {
    if (!clientRef.current || !garmentBlobRef.current) return;
    lastPromptRef.current = prompt;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt,
      enhance: false,
    });
  }, [clientRef, prompt]);

  return (
    <div className="h-screen flex">
      <ProductSidebar
        activeProduct={activeProduct}
        uploadedImage={uploadedImage}
        isUploadActive={isUploadActive}
        onSelectProduct={handleSelectProduct}
        onUploadGarment={handleUploadGarment}
        onClearUpload={handleClearUpload}
      />
      <CombinedView
        localStream={stream}
        status={status}
        error={error}
        personPresent={personPresent}
        detectionReady={detectionReady}
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
