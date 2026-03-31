"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ROTATION_ITEMS, Product } from "@/lib/products";
import { urlToImageBlob } from "@/lib/image-utils";

const DEFAULT_INTERVAL = 8; // seconds between rotations

type RealtimeClient = {
  setImage: (
    blob: Blob | null,
    opts?: { prompt?: string; enhance?: boolean; timeout?: number }
  ) => Promise<void>;
};

interface UseIdleRotationOptions {
  enabled: boolean;
  hasController: boolean;
  isConnected: boolean;
  clientRef: React.RefObject<RealtimeClient | null>;
  interval?: number;
}

export function useIdleRotation({
  enabled,
  hasController,
  isConnected,
  clientRef,
  interval = DEFAULT_INTERVAL,
}: UseIdleRotationOptions) {
  const [isRotating, setIsRotating] = useState(false);
  const [currentItem, setCurrentItem] = useState<Product | null>(null);

  const blobCacheRef = useRef<Map<string, Blob>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const hasAppliedFirstRef = useRef(false);

  const items = ROTATION_ITEMS;
  const shouldRotate = enabled && items.length > 0 && !hasController;

  // Pre-fetch blobs for all rotation items
  useEffect(() => {
    if (!enabled) return;
    items.forEach((item) => {
      if (!blobCacheRef.current.has(item.id)) {
        urlToImageBlob(item.image)
          .then((blob) => blobCacheRef.current.set(item.id, blob))
          .catch((err) =>
            console.error(`[rotation] Pre-fetch failed ${item.name}:`, err)
          );
      }
    });
  }, [enabled, items]);

  // Apply a single rotation item
  const applyItem = useCallback(
    async (item: Product) => {
      const client = clientRef.current;
      if (!client) return;
      try {
        const blob =
          blobCacheRef.current.get(item.id) ??
          (await urlToImageBlob(item.image));
        await client.setImage(blob, {
          prompt: item.prompt,
          enhance: false,
          timeout: 30_000,
        });
        setCurrentItem(item);
      } catch (err) {
        console.error("[rotation] Failed to apply item:", err);
      }
    },
    [clientRef]
  );

  // Apply first item when connected
  useEffect(() => {
    if (
      shouldRotate &&
      isConnected &&
      !hasAppliedFirstRef.current &&
      items.length > 0
    ) {
      hasAppliedFirstRef.current = true;
      setIsRotating(true);
      currentIndexRef.current = 0;
      applyItem(items[0]);
    }
  }, [shouldRotate, isConnected, items, applyItem]);

  // Cycle on interval
  useEffect(() => {
    if (!shouldRotate || !isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!shouldRotate) setIsRotating(false);
      return;
    }

    intervalRef.current = setInterval(() => {
      currentIndexRef.current =
        (currentIndexRef.current + 1) % items.length;
      applyItem(items[currentIndexRef.current]);
    }, interval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldRotate, isConnected, items, interval, applyItem]);

  // Re-apply current item on reconnection
  useEffect(() => {
    if (
      shouldRotate &&
      isConnected &&
      hasAppliedFirstRef.current &&
      items.length > 0
    ) {
      applyItem(items[currentIndexRef.current]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Reset when rotation stops (controller connected)
  useEffect(() => {
    if (!shouldRotate) {
      hasAppliedFirstRef.current = false;
      currentIndexRef.current = 0;
      setCurrentItem(null);
    }
  }, [shouldRotate]);

  return {
    isRotating,
    currentItem,
    shouldAutoConnect: shouldRotate,
  };
}
