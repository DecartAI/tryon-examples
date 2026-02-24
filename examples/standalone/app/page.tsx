"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";
import { ProductSidebar } from "@/components/ProductSidebar";
import { TryOnView } from "@/components/TryOnView";

export default function StandalonePage() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();
  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const connectedRef = useRef(false);

  const handleRemoteStreamRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      remoteVideoRef.current = ref;
    },
    []
  );

  // Auto-start camera and connect on mount
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
        prompt: "Show person as is",
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current?.current) {
            remoteVideoRef.current.current.srcObject = remoteStream;
          }
        },
      });
      connectedRef.current = true;
    }

    init();

    return () => {
      cancelled = true;
      disconnect();
      stopCamera();
    };
  }, [startCamera, stopCamera, connect, disconnect]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!event.over || !event.active.data.current) return;
      const product = event.active.data.current as Product;
      setActiveProduct(product);

      if (!clientRef.current) return;

      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      clientRef.current.setImage(resized, {
        prompt: product.prompt,
        enhance: false,
      });
    },
    [clientRef]
  );

  return (
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
  );
}
