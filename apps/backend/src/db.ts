// In-memory data store and utilities
export type User = { id: number; name: string; email: string; createdAt: string };
export type Product = { id: number; name: string; price: number };
export type Order = { id: number; userId: number; productId: number; amount: number; createdAt: string };

export const db = {
  users: [] as User[],
  products: [] as Product[],
  orders: [] as Order[],
};

// Deterministic PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedInMemory({ users, products, orders }: { users: number; products: number; orders: number }): { users: number; products: number; orders: number } {
  const rng = mulberry32(123456789);
  db.users.length = 0;
  db.products.length = 0;
  db.orders.length = 0;

  for (let i = 0; i < products; i++) {
    db.products.push({ id: i + 1, name: `Product ${i + 1}`, price: Number((rng() * 1000 + 1).toFixed(2)) });
  }
  for (let i = 0; i < users; i++) {
    const createdAt = new Date(Date.now() - Math.floor(rng() * 365 * 24 * 3600 * 1000)).toISOString();
    db.users.push({ id: i + 1, name: `User ${i + 1}`, email: `user${i + 1}@example.com`, createdAt });
  }
  for (let i = 0; i < orders; i++) {
    const userId = Math.floor(rng() * users) + 1;
    const productId = Math.floor(rng() * products) + 1;
    const amount = Number((rng() * 5 + 1).toFixed(2));
    const createdAt = new Date(Date.now() - Math.floor(rng() * 365 * 24 * 3600 * 1000)).toISOString();
    db.orders.push({ id: i + 1, userId, productId, amount, createdAt });
  }
  return { users: db.users.length, products: db.products.length, orders: db.orders.length };
}

export type UserRow = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  orderTotal: number;
};


