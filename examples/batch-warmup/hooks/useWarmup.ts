"use client";

import { useState, useCallback, useRef } from "react";
import { Product } from "@/lib/products";
import {
  urlToImageBlob,
  resizeImageBlob,
  captureVideoFrame,
  submitWarmup,
  pollWarmupResult,
} from "@/lib/image-utils";
import { enhancePrompt } from "@/lib/enhance-prompt";

const POLL_INTERVAL = 2000;
const PROMPT_CONCURRENCY = 5;

export interface WarmupEntry {
  imageBlob: Blob;
  prompt: string;
}

export type WarmupStatus = "idle" | "running" | "done" | "cancelled";

interface WarmupProgress {
  total: number;
  completed: number;
  failed: number;
}

interface UseWarmupOptions {
  products: Product[];
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
}

interface PendingItem {
  product: Product;
  prompt: string;
  requestId: string;
}

export function useWarmup({ products, localVideoRef }: UseWarmupOptions) {
  const [status, setStatus] = useState<WarmupStatus>("idle");
  const [progress, setProgress] = useState<WarmupProgress>({
    total: 0,
    completed: 0,
    failed: 0,
  });
  const cacheRef = useRef<Map<string, WarmupEntry>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const startWarmup = useCallback(async () => {
    if (products.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setProgress({ total: products.length, completed: 0, failed: 0 });
    cacheRef.current.clear();

    // Capture person snapshot for FAL generation
    const video = localVideoRef.current;
    if (!video || video.videoWidth === 0) {
      console.warn("[warmup] No video available, aborting");
      setStatus("idle");
      return;
    }

    const personSnapshot = await captureVideoFrame(video, 512);
    if (controller.signal.aborted) {
      setStatus("cancelled");
      return;
    }

    // Also capture a smaller frame for LLM prompt generation
    const llmFrame = await captureVideoFrame(video, 320);
    if (controller.signal.aborted) {
      setStatus("cancelled");
      return;
    }

    let completed = 0;
    let failed = 0;

    // Phase 1: Generate prompts + submit all to FAL queue
    const pending: PendingItem[] = [];
    let promptIndex = 0;

    const promptTasks = products.map((product) => async () => {
      if (controller.signal.aborted) return;

      try {
        const clothingBlob = await urlToImageBlob(product.image);
        if (controller.signal.aborted) return;

        // Generate prompt via LLM
        const resized = await resizeImageBlob(clothingBlob);
        const prompt =
          product.prompt ||
          (await enhancePrompt(resized, localVideoRef.current)) ||
          "Try on this garment";
        if (controller.signal.aborted) return;

        // Submit to FAL queue
        const requestId = await submitWarmup(clothingBlob, personSnapshot);
        if (controller.signal.aborted) return;

        pending.push({ product, prompt, requestId });
        console.log(
          `[warmup] Submitted ${product.name} (${pending.length}/${products.length})`
        );
      } catch (e) {
        failed++;
        console.error(`[warmup] Submit failed for ${product.name}:`, e);
        setProgress({ total: products.length, completed, failed });
      }
    });

    // Run with limited concurrency
    const workers = Array.from({ length: PROMPT_CONCURRENCY }, async () => {
      while (promptIndex < promptTasks.length) {
        if (controller.signal.aborted) return;
        const taskIndex = promptIndex++;
        if (taskIndex >= promptTasks.length) return;
        await promptTasks[taskIndex]();
      }
    });
    await Promise.all(workers);

    if (controller.signal.aborted) {
      setStatus("cancelled");
      return;
    }

    console.log(
      `[warmup] All ${pending.length} items submitted, polling for results...`
    );

    // Phase 2: Poll for all results
    const remaining = new Set(pending.map((_, i) => i));

    while (remaining.size > 0 && !controller.signal.aborted) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      if (controller.signal.aborted) break;

      const pollPromises = [...remaining].map(async (idx) => {
        const item = pending[idx];
        try {
          const result = await pollWarmupResult(item.requestId);
          if (result.status === "COMPLETED" && result.blob) {
            cacheRef.current.set(item.product.id, {
              imageBlob: result.blob,
              prompt: item.prompt,
            });
            remaining.delete(idx);
            completed++;
            console.log(
              `[warmup] Completed ${item.product.name} (${completed}/${products.length})`
            );
            setProgress({ total: products.length, completed, failed });
          }
        } catch (e) {
          remaining.delete(idx);
          failed++;
          console.error(
            `[warmup] Result failed for ${item.product.name}:`,
            e
          );
          setProgress({ total: products.length, completed, failed });
        }
      });

      await Promise.all(pollPromises);
    }

    if (controller.signal.aborted) {
      setStatus("cancelled");
    } else {
      setStatus("done");
      console.log(
        `[warmup] Done: ${completed} succeeded, ${failed} failed out of ${products.length}`
      );
    }
  }, [products, localVideoRef]);

  const cancelWarmup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("cancelled");
  }, []);

  const getFromCache = useCallback(
    (productId: string): WarmupEntry | undefined => {
      return cacheRef.current.get(productId);
    },
    []
  );

  return {
    startWarmup,
    cancelWarmup,
    getFromCache,
    progress,
    status,
  };
}
