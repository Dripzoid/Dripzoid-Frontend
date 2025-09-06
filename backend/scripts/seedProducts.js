// scripts/seedProducts.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Resolve DB file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../dripzoid.db");

// Connect to SQLite
const db = new sqlite3.Database(dbPath);

const products = [
  // Men - Shirts
  {
    name: "Men's Casual Cotton Shirt",
    category: "Men",
    subcategory: "Shirts",
    price: 1299,
    originalPrice: 1999,
    images: "https://images.unsplash.com/photo-1593032465171-d3be6b65b7c7,https://images.unsplash.com/photo-1589391886645-d51941baf7b3",
    rating: 4.5,
    sizes: "S,M,L,XL",
    color: "Blue",
    description: "A comfortable casual cotton shirt perfect for everyday wear.",
    stock: 50
  },
  {
    name: "Men's Slim Fit White Shirt",
    category: "Men",
    subcategory: "Shirts",
    price: 1499,
    originalPrice: 2299,
    images: "https://images.unsplash.com/photo-1562157873-818bc0726f68,https://images.unsplash.com/photo-1581089781785-603411fa81e5",
    rating: 4.2,
    sizes: "M,L,XL",
    color: "White",
    description: "Slim fit white shirt made from premium cotton fabric.",
    stock: 40
  },
  // Men - Pants
  {
    name: "Men's Chino Pants",
    category: "Men",
    subcategory: "Pants",
    price: 1599,
    originalPrice: 2499,
    images: "https://images.unsplash.com/photo-1602810318383-e3f4d3e1b9aa,https://images.unsplash.com/photo-1512436991641-6745cdb1723f",
    rating: 4.3,
    sizes: "30,32,34,36",
    color: "Beige",
    description: "Stylish chino pants for semi-formal and casual occasions.",
    stock: 35
  },
  {
    name: "Men's Formal Black Pants",
    category: "Men",
    subcategory: "Pants",
    price: 1899,
    originalPrice: 2699,
    images: "https://images.unsplash.com/photo-1602810318123-9e95f9e2c1ad,https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    rating: 4.6,
    sizes: "30,32,34,36,38",
    color: "Black",
    description: "Perfectly tailored black formal pants for office wear.",
    stock: 28
  },
  // Men - Jeans
  {
    name: "Men's Blue Slim Fit Jeans",
    category: "Men",
    subcategory: "Jeans",
    price: 1799,
    originalPrice: 2599,
    images: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c,https://images.unsplash.com/photo-1583001529352-c1e8d4f3e0a1",
    rating: 4.4,
    sizes: "30,32,34,36",
    color: "Blue",
    description: "Classic slim fit blue jeans made from stretchable denim.",
    stock: 45
  },
  {
    name: "Men's Distressed Jeans",
    category: "Men",
    subcategory: "Jeans",
    price: 1999,
    originalPrice: 2999,
    images: "https://images.unsplash.com/photo-1594633312681-1250a1e3f36b,https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb",
    rating: 4.1,
    sizes: "30,32,34,36",
    color: "Light Blue",
    description: "Trendy distressed jeans for a stylish casual look.",
    stock: 30
  },
  // Women - Hoodies
  {
    name: "Women's Oversized Hoodie",
    category: "Women",
    subcategory: "Hoodies",
    price: 1699,
    originalPrice: 2399,
    images: "https://images.unsplash.com/photo-1614285372440-26d7c8c94fb4,https://images.unsplash.com/photo-1600185365483-26f963cfb9fc",
    rating: 4.7,
    sizes: "S,M,L",
    color: "Pink",
    description: "Cozy oversized hoodie with a soft inner lining.",
    stock: 25
  },
  {
    name: "Women's Black Zipper Hoodie",
    category: "Women",
    subcategory: "Hoodies",
    price: 1599,
    originalPrice: 2299,
    images: "https://images.unsplash.com/photo-1603252109303-2751441dd157,https://images.unsplash.com/photo-1581089781785-603411fa81e5",
    rating: 4.5,
    sizes: "S,M,L,XL",
    color: "Black",
    description: "Classic black hoodie with zipper closure and pockets.",
    stock: 20
  },
  // Women - Kurtis
  {
    name: "Women's Floral Print Kurti",
    category: "Women",
    subcategory: "Kurtis",
    price: 1299,
    originalPrice: 1899,
    images: "https://images.unsplash.com/photo-1612178995402-e4f97b6e5e7f,https://images.unsplash.com/photo-1600185365483-26f963cfb9fc",
    rating: 4.3,
    sizes: "S,M,L,XL",
    color: "Red",
    description: "Elegant floral print kurti for casual and festive wear.",
    stock: 35
  },
  {
    name: "Women's Cotton Long Kurti",
    category: "Women",
    subcategory: "Kurtis",
    price: 1499,
    originalPrice: 2099,
    images: "https://images.unsplash.com/photo-1614285372440-26d7c8c94fb4,https://images.unsplash.com/photo-1593032465171-d3be6b65b7c7",
    rating: 4.4,
    sizes: "M,L,XL",
    color: "Blue",
    description: "Comfortable long cotton kurti with minimal design.",
    stock: 27
  },
  // Women - Skirts
  {
    name: "Women's Pleated Skirt",
    category: "Women",
    subcategory: "Skirts",
    price: 1199,
    originalPrice: 1699,
    images: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c,https://images.unsplash.com/photo-1581089781785-603411fa81e5",
    rating: 4.6,
    sizes: "S,M,L",
    color: "White",
    description: "Stylish pleated skirt perfect for summer outings.",
    stock: 22
  },
  {
    name: "Women's Denim Skirt",
    category: "Women",
    subcategory: "Skirts",
    price: 1399,
    originalPrice: 1999,
    images: "https://images.unsplash.com/photo-1594633312681-1250a1e3f36b,https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb",
    rating: 4.2,
    sizes: "S,M,L,XL",
    color: "Blue",
    description: "Casual denim skirt with a trendy design.",
    stock: 18
  },
  // Kids - Shirts
  {
    name: "Kids' Cotton Shirt",
    category: "Kids",
    subcategory: "Shirts",
    price: 799,
    originalPrice: 1199,
    images: "https://images.unsplash.com/photo-1589391886645-d51941baf7b3,https://images.unsplash.com/photo-1614285372440-26d7c8c94fb4",
    rating: 4.5,
    sizes: "2-4Y,4-6Y,6-8Y",
    color: "Yellow",
    description: "Soft cotton shirt for kids with fun prints.",
    stock: 40
  },
  {
    name: "Kids' Formal Shirt",
    category: "Kids",
    subcategory: "Shirts",
    price: 899,
    originalPrice: 1399,
    images: "https://images.unsplash.com/photo-1562157873-818bc0726f68,https://images.unsplash.com/photo-1581089781785-603411fa81e5",
    rating: 4.3,
    sizes: "4-6Y,6-8Y,8-10Y",
    color: "White",
    description: "Formal shirt for kids suitable for special occasions.",
    stock: 32
  },
  // Kids - Pants
  {
    name: "Kids' Jogger Pants",
    category: "Kids",
    subcategory: "Pants",
    price: 899,
    originalPrice: 1299,
    images: "https://images.unsplash.com/photo-1602810318383-e3f4d3e1b9aa,https://images.unsplash.com/photo-1512436991641-6745cdb1723f",
    rating: 4.4,
    sizes: "2-4Y,4-6Y,6-8Y",
    color: "Gray",
    description: "Comfortable jogger pants for active kids.",
    stock: 38
  },
  {
    name: "Kids' Blue Denim Jeans",
    category: "Kids",
    subcategory: "Jeans",
    price: 999,
    originalPrice: 1499,
    images: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c,https://images.unsplash.com/photo-1583001529352-c1e8d4f3e0a1",
    rating: 4.5,
    sizes: "4-6Y,6-8Y,8-10Y",
    color: "Blue",
    description: "Classic blue denim jeans for kids with soft stretch.",
    stock: 30
  }
];

console.log("🗑 Clearing old products...");
await db.run(`DELETE FROM products`);

console.log("📦 Inserting products...");
for (const p of products) {
  await db.run(
    `INSERT INTO products
    (name, category, subcategory, price, images, rating, sizes, color, originalPrice, description, stock, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
    [
      p.name,
      p.category,
      p.subcategory,
      p.price,
      p.images,
      p.rating,
      p.sizes,
      p.color,
      p.originalPrice,
      p.description,
      p.stock
    ]
  );
}

console.log("✅ Seeded 20 products successfully!");
await db.close();
