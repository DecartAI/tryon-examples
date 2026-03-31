"use client";

import { useMemo } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import { WarmupEntry, WarmupStatus } from "@/hooks/useWarmup";
import Image from "next/image";

interface WarmupProgress {
  total: number;
  completed: number;
  failed: number;
}

interface WarmupGalleryProps {
  activeProduct: Product | null;
  warmupStatus: WarmupStatus;
  warmupProgress: WarmupProgress;
  getFromCache: (productId: string) => WarmupEntry | undefined;
  onSelectProduct: (product: Product) => void;
  onStartWarmup: () => void;
  onCancelWarmup: () => void;
}

export function WarmupGallery({
  activeProduct,
  warmupStatus,
  warmupProgress,
  getFromCache,
  onSelectProduct,
  onStartWarmup,
  onCancelWarmup,
}: WarmupGalleryProps) {
  const progressPercent =
    warmupProgress.total > 0
      ? Math.round(
          ((warmupProgress.completed + warmupProgress.failed) /
            warmupProgress.total) *
            100
        )
      : 0;

  // Create preview URLs for cached items
  const previewUrls = useMemo(() => {
    const urls = new Map<string, string>();
    for (const product of PRODUCTS) {
      const entry = getFromCache(product.id);
      if (entry) {
        urls.set(product.id, URL.createObjectURL(entry.imageBlob));
      }
    }
    return urls;
  }, [getFromCache, warmupProgress.completed]);

  return (
    <aside className="w-80 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-lg">Batch Warmup</h2>
        <p className="text-sm text-gray-400 mt-1">
          Pre-generate try-on images for instant display
        </p>
      </div>

      {/* Warmup controls */}
      <div className="p-4 border-b border-gray-800 space-y-3">
        {warmupStatus === "idle" || warmupStatus === "cancelled" ? (
          <button
            onClick={onStartWarmup}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
          >
            Start Warmup
          </button>
        ) : warmupStatus === "running" ? (
          <>
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>
                  Generating... {warmupProgress.completed}/
                  {warmupProgress.total}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {warmupProgress.failed > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  {warmupProgress.failed} failed
                </p>
              )}
            </div>
            <button
              onClick={onCancelWarmup}
              className="w-full py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <div className="text-sm text-green-400">
            Warmup complete - {warmupProgress.completed} images ready
          </div>
        )}

        <p className="text-xs text-gray-500">
          {warmupStatus === "idle"
            ? "Click to pre-generate try-on images for all products. Products with cached images will load instantly."
            : warmupStatus === "running"
              ? "Generating prompts and submitting to FAL queue in parallel..."
              : "Click any product to see its pre-generated try-on, or apply it to the live stream."}
        </p>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => {
            const cached = getFromCache(product.id);
            const previewUrl = previewUrls.get(product.id);
            const isActive = activeProduct?.id === product.id;

            return (
              <button
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                  isActive
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="relative aspect-square bg-gray-800">
                  {/* Show warmup preview if available, otherwise product image */}
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`${product.name} try-on preview`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  )}

                  {/* Warmup status badge */}
                  {warmupStatus === "running" && !cached && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {cached && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2 bg-gray-900">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">${product.price}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
