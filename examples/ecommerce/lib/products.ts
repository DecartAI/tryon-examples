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
    name: "Blue Cashmere Sweater",
    image: "/products/blue-sweater.png",
    prompt:
      "Substitute the current top with a light blue cashmere crew neck sweater with a slim fit",
    price: 129,
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
  {
    name: "Beige Quarter-Zip",
    image: "/products/beige-quarter-zip.png",
    prompt:
      "Substitute the current top with a beige ribbed knit quarter-zip sweater with a relaxed fit",
    price: 89,
  },
];
