"use client";

import { useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ConnectionStatus } from "@/hooks/useDecartRealtime";

interface TryOnViewProps {
  localStream: MediaStream | null;
  status: ConnectionStatus;
  error: string | null;
  onRemoteStream: (ref: React.RefObject<HTMLVideoElement | null>) => void;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "Waiting for camera...",
  connecting: "Connecting to Decart...",
  connected: "Connected - drag a product to try on",
  generating: "Live",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
  error: "Connection error",
};

export function TryOnView({
  localStream,
  status,
  error,
  onRemoteStream,
}: TryOnViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const { setNodeRef, isOver } = useDroppable({ id: "tryon-drop-zone" });

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    onRemoteStream(remoteVideoRef);
  }, [onRemoteStream]);

  const isGenerating = status === "generating";

  return (
    <div ref={setNodeRef} className="relative flex-1 bg-black">
      {/* Local camera feed */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          isGenerating ? "opacity-20" : "opacity-100"
        }`}
      />

      {/* Remote AI stream */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          isGenerating ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Drop zone overlay */}
      {isOver && (
        <div className="absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-400 flex items-center justify-center z-10">
          <p className="text-xl font-semibold text-white bg-blue-500/80 px-6 py-3 rounded-xl">
            Drop to try on
          </p>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-4 left-4 z-20">
        <div
          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
            isGenerating
              ? "bg-green-500/90 text-white"
              : status === "error"
                ? "bg-red-500/90 text-white"
                : "bg-black/60 text-white"
          }`}
        >
          {isGenerating && (
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
          {STATUS_LABELS[status]}
        </div>
      </div>

      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg z-20">
          {error}
        </div>
      )}
    </div>
  );
}
