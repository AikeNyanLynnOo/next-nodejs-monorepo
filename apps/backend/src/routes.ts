import { Router } from "express";
import { db, seedInMemory, UserRow, generateTree, getNodePath } from "./db";
import { quoteStore, startRandomQuoteGenerator, stopRandomQuoteGenerator } from "./quotes";

export const router = Router();

router.post("/dev/seed", async (req, res) => {
  const users = Number((req.query.users as string) || 1000);
  const orders = Number((req.query.orders as string) || 10000);
  const products = Number((req.query.products as string) || 1000);
  const breadth = Number((req.query.breadth as string) || 20);
  const depth = Number((req.query.depth as string) || 10);
  
  const counts = seedInMemory({ users, products, orders });
  const treeCounts = generateTree(breadth, depth);
  
  res.json({ ...counts, ...treeCounts });
});

// Quotes API
router.get("/api/quotes/snapshot", (req, res) => {
  const symbolsParam = (req.query.symbols as string) || "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (symbols.length === 0) return res.json({});
  return res.json(quoteStore.snapshot(symbols));
});

router.post("/dev/quotes/start", (req, res) => {
  const rate = Number((req.query.rate as string) || 20);
  const symbolsParam = (req.query.symbols as string) || "";
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const info = startRandomQuoteGenerator({ ratePerSec: rate, symbols });
  res.json({ started: true, ...info });
});

router.post("/dev/quotes/stop", (req, res) => {
  stopRandomQuoteGenerator();
  res.json({ stopped: true });
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

// Org Chart / File Explorer endpoints
router.get("/api/nodes/root", async (req, res) => {
  const rootNodes = db.nodes.filter(node => node.parentId === null);
  res.json(rootNodes);
});

router.get("/api/nodes/:id/children", async (req, res) => {
  const { id } = req.params;
  const children = db.nodes.filter(node => node.parentId === id);
  res.json(children);
});

router.get("/api/search", async (req, res) => {
  const query = (req.query.q as string) || "";
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 100)));
  
  if (!query.trim()) {
    return res.json([]);
  }
  
  const lcQuery = query.toLowerCase();
  const matchedNodes = db.nodes
    .filter(node => node.name.toLowerCase().includes(lcQuery))
    .slice(0, limit)
    .map(node => ({
      id: node.id,
      name: node.name,
      path: getNodePath(node.id)
    }));
  
  res.json(matchedNodes);
});
