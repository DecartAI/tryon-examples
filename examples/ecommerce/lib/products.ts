export interface Product {
  name: string;
  image: string;
  prompt: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  {
    name: "Yellow Puffer Jacket",
    image: "/products/yellow-puffer.png",
    prompt:
      "Substitute the current top with a bright yellow puffer jacket with a zip front and oversized fit",
    price: 149,
  },
  {
    name: "Black Puffer Jacket",
    image: "/products/black-puffer.png",
    prompt:
      "Substitute the current top with a glossy black hooded puffer jacket with a zip front",
    price: 189,
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
  {
    name: "Striped Knit Tee",
    image: "/products/striped-knit-tee.png",
    prompt:
      "Substitute the current top with a black and white striped knit short-sleeve tee",
    price: 59,
  },
  {
    name: "Denim Jacket",
    image: "/products/denim-jacket.png",
    prompt:
      "Substitute the current top with a dark washed denim zip jacket with a pointed collar",
    price: 99,
  },
];
