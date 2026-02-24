"use client";

import { PRODUCTS, Product } from "@/lib/products";
import { DraggableProduct } from "./DraggableProduct";

interface ProductSidebarProps {
  activeProduct: Product | null;
}

export function ProductSidebar({ activeProduct }: ProductSidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-lg">Products</h2>
        <p className="text-sm text-gray-400 mt-1">
          Drag onto the video to try on
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <DraggableProduct
              key={product.name}
              product={product}
              isActive={activeProduct?.name === product.name}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
