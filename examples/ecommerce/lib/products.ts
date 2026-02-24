export interface Product {
  name: string;
  image: string;
  prompt: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  {
    name: "Denim Jacket",
    image: "/products/denim-jacket.jpg",
    prompt:
      "Substitute the current top with a classic blue denim jacket with a relaxed fit",
    price: 89,
  },
  {
    name: "Red Hoodie",
    image: "/products/red-hoodie.jpg",
    prompt:
      "Substitute the current top with a bright red hoodie with an oversized casual fit",
    price: 59,
  },
  {
    name: "Flannel Shirt",
    image: "/products/flannel-shirt.jpg",
    prompt:
      "Substitute the current top with a red and black plaid flannel shirt",
    price: 49,
  },
  {
    name: "Knit Sweater",
    image: "/products/knit-sweater.jpg",
    prompt:
      "Substitute the current top with a cozy knit sweater with a crew neck",
    price: 69,
  },
  {
    name: "Leather Bomber",
    image: "/products/leather-bomber.jpg",
    prompt:
      "Substitute the current top with a black leather bomber jacket",
    price: 199,
  },
  {
    name: "White T-Shirt",
    image: "/products/white-tee.jpg",
    prompt:
      "Substitute the current top with a plain white cotton t-shirt with a regular fit",
    price: 29,
  },
];
