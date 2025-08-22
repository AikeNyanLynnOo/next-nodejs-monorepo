import { Router } from "express";
import { db, seedInMemory, UserRow } from "./db";

export const router = Router();

router.post("/dev/seed", async (req, res) => {
  const users = Number((req.query.users as string) || 1000);
  const orders = Number((req.query.orders as string) || 10000);
  const products = Number((req.query.products as string) || 1000);
  const counts = seedInMemory({ users, products, orders });
  res.json(counts);
});

router.get("/api/users", async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSizeRaw = Number(req.query.pageSize || 50);
  const pageSize = Math.max(1, Math.min(200, pageSizeRaw));
  const search = (req.query.search as string) || "";
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortDir =
    ((req.query.sortDir as string) || "desc").toLowerCase() === "asc"
      ? "ASC"
      : "DESC";
  const lcSearch = search.toLowerCase();
  const filtered = lcSearch
    ? db.users.filter(
        (u) =>
          u.name.toLowerCase().includes(lcSearch) ||
          u.email.toLowerCase().includes(lcSearch)
      )
    : db.users;

  console.log(req.query);

  // Precompute aggregates
  const userIdToAgg = new Map<
    number,
    { orderCount: number; orderTotal: number }
  >();
  for (const u of filtered)
    userIdToAgg.set(u.id, { orderCount: 0, orderTotal: 0 });
  for (const o of db.orders) {
    const agg = userIdToAgg.get(o.userId);
    if (agg) {
      agg.orderCount += 1;
      agg.orderTotal += o.amount;
    }
  }

  let rows: UserRow[] = filtered.map((u) => {
    const agg = userIdToAgg.get(u.id) || { orderCount: 0, orderTotal: 0 };
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      orderCount: agg.orderCount,
      orderTotal: Number(agg.orderTotal.toFixed(2)),
    };
  });

  rows.sort((a, b) => {
    const dir = sortDir === "ASC" ? 1 : -1;
    switch (sortBy) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "email":
        return dir * a.email.localeCompare(b.email);
      case "orderCount":
        return dir * (a.orderCount - b.orderCount);
      case "orderTotal":
        return dir * (a.orderTotal - b.orderTotal);
      case "createdAt":
      default:
        return (
          dir *
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);
  res.json({ items, total, page, pageSize });
});

router.get("/api/users/:id/orders", async (req, res) => {
  const userId = Number(req.params.id);
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSizeRaw = Number(req.query.pageSize || 50);
  const pageSize = Math.max(1, Math.min(200, pageSizeRaw));
  const all = db.orders
    .filter((o) => o.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const total = all.length;
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  res.json({ items, total, page, pageSize });
});
