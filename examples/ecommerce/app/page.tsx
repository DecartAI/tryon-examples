"use client";

import { useState } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { TryOnModal } from "@/components/TryOnModal";

export default function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-gray-500 mt-1">
            Click &quot;Try On&quot; to see how it looks on you
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.name}
              product={product}
              onTryOn={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      </div>

      {selectedProduct && (
        <TryOnModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}
