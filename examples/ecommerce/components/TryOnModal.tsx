"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import {
  useDecartRealtime,
  ConnectionStatus,
} from "@/hooks/useDecartRealtime";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";

interface TryOnModalProps {
  product: Product;
  onClose: () => void;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "Initializing...",
  connecting: "Connecting...",
  connected: "Connected - applying garment...",
  generating: "Live",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
  error: "Connection error",
};

export function TryOnModal({ product, onClose }: TryOnModalProps) {
  const { error: camError, startCamera, stopCamera } = useCamera();
  const { status, error: rtError, connect, disconnect, clientRef } =
    useDecartRealtime();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prompt, setPrompt] = useState(product.prompt);
  const [showPrompt, setShowPrompt] = useState(false);
  const garmentBlobRef = useRef<Blob | null>(null);

  const handleRemoteStream = useCallback((remoteStream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const mediaStream = await startCamera();
      if (!mediaStream || cancelled) return;

      const res = await fetch("/api/tokens", { method: "POST" });
      const { apiKey } = await res.json();
      if (cancelled) return;

      const rtClient = await connect({
        apiKey,
        stream: mediaStream,
        onRemoteStream: handleRemoteStream,
      });

      if (!rtClient || cancelled) return;

      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;
      rtClient.setImage(resized, {
        prompt: product.prompt,
        enhance: false,
      });
    }

    init();

    return () => {
      cancelled = true;
      disconnect();
      stopCamera();
    };
  }, [
    product,
    startCamera,
    stopCamera,
    connect,
    disconnect,
    handleRemoteStream,
  ]);

  const handleClose = () => {
    disconnect();
    stopCamera();
    onClose();
  };

  const handlePromptSubmit = () => {
    if (!clientRef.current || !garmentBlobRef.current) return;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt,
      enhance: false,
    });
  };

  const error = camError || rtError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="relative w-full max-w-5xl max-h-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-lg">Try On: {product.name}</h2>
            <p className="text-sm text-gray-500">{STATUS_LABELS[status]}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1 min-h-0 aspect-[4/3] bg-gray-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {status === "generating" && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-500/90 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showPrompt ? "Hide prompt" : "Show prompt"}
          </button>
          {showPrompt && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <button
                onClick={handlePromptSubmit}
                className="text-sm px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
