"use client";

import { useDraggable } from "@dnd-kit/core";
import { Product } from "@/lib/products";
import Image from "next/image";

interface DraggableProductProps {
  product: Product;
  isActive: boolean;
}

export function DraggableProduct({ product, isActive }: DraggableProductProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: product.name, data: product });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-50 scale-95 border-blue-400"
          : isActive
            ? "border-blue-500 ring-2 ring-blue-500/30"
            : "border-gray-700 hover:border-gray-500"
      }`}
    >
      <div className="relative aspect-square bg-gray-800">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="150px"
          draggable={false}
        />
      </div>
      <div className="p-2 bg-gray-900">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <p className="text-xs text-gray-400">${product.price}</p>
      </div>
    </div>
  );
}
