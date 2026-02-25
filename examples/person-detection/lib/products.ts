export interface Product {
  name: string;
  image: string;
  prompt: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  {
    name: "Flame Hoodie",
    image: "/products/flame-hoodie.png",
    prompt:
      "Substitute the current top with a blue and pink flame print hoodie with a kangaroo pocket and oversized fit",
    price: 89,
  },
  {
    name: "Flame Knit Sweater",
    image: "/products/flame-knit-sweater.png",
    prompt:
      "Substitute the current top with a blue and orange flame pattern knit sweater with a crew neck",
    price: 79,
  },
  {
    name: "Light Blue Puffer",
    image: "/products/light-blue-puffer.png",
    prompt:
      "Substitute the current top with a light blue quilted puffer jacket with a zip front and stand collar",
    price: 159,
  },
  {
    name: "Leather Jacket",
    image: "/products/leather-jacket.jpg",
    prompt:
      "Substitute the current top with a black leather motorcycle jacket with a zip front and lapel collar",
    price: 249,
  },
  {
    name: "Heart Patch Jeans",
    image: "/products/heart-jeans.png",
    prompt:
      "Substitute the current bottoms with wide-leg blue denim jeans with heart-shaped patchwork cutouts",
    price: 89,
  },
  {
    name: "Flame Sweatpants",
    image: "/products/flame-sweatpants.png",
    prompt:
      "Substitute the current bottoms with blue and pink flame print sweatpants with an elastic waist and relaxed fit",
    price: 79,
  },
];
