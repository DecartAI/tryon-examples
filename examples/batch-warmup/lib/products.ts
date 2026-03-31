export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  prompt?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "beanie",
    name: "Decart Beanie",
    image: "/products/decart-beanie.png",
    price: 35,
  },
  {
    id: "bomber",
    name: "Decart Bomber Jacket",
    image: "/products/decart-bomber.png",
    price: 149,
  },
  {
    id: "cap",
    name: "Decart Cap",
    image: "/products/decart-cap.png",
    price: 29,
  },
  {
    id: "crewneck",
    name: "Decart Crewneck",
    image: "/products/decart-crewneck.png",
    price: 89,
  },
  {
    id: "hoodie",
    name: "Decart Hoodie",
    image: "/products/decart-hoodie.png",
    price: 99,
  },
  {
    id: "polo",
    name: "Decart Polo",
    image: "/products/decart-polo.png",
    price: 69,
  },
  {
    id: "tshirt",
    name: "Decart T-Shirt",
    image: "/products/decart-tshirt.png",
    price: 45,
  },
  {
    id: "zipup",
    name: "Decart Zip-Up Hoodie",
    image: "/products/decart-zipup.png",
    price: 109,
  },
  {
    id: "rainjacket",
    name: "Decart Rain Jacket",
    image: "/products/decart-rainjacket.png",
    price: 129,
  },
  {
    id: "blazer",
    name: "Decart Blazer",
    image: "/products/decart-blazer.png",
    price: 199,
  },
];
