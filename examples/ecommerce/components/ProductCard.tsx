import { Product } from "@/lib/products";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  onTryOn: () => void;
}

export function ProductCard({ product, onTryOn }: ProductCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <p className="text-gray-500 mt-1">${product.price}</p>
        <button
          onClick={onTryOn}
          className="mt-3 w-full py-2.5 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Try On
        </button>
      </div>
    </div>
  );
}
