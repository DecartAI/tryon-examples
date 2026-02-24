export interface Product {
  name: string;
  image: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  {
    name: "Flame Hoodie",
    image: "/products/flame-hoodie.png",
    price: 89,
  },
  {
    name: "Flame Knit Sweater",
    image: "/products/flame-knit-sweater.png",
    price: 79,
  },
  {
    name: "Light Blue Puffer",
    image: "/products/light-blue-puffer.png",
    price: 159,
  },
  {
    name: "Leather Jacket",
    image: "/products/leather-jacket.jpg",
    price: 249,
  },
  {
    name: "Heart Patch Jeans",
    image: "/products/heart-jeans.png",
    price: 89,
  },
  {
    name: "Flame Sweatpants",
    image: "/products/flame-sweatpants.png",
    price: 79,
  },
];
