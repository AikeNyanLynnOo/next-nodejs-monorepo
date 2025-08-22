import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";

export type QuoteTick = { symbol: string; price: number; ts: string };

// Singleton in-memory store
class QuoteStore {
  private symbolToQuote = new Map<string, QuoteTick>();

  upsert(symbol: string, price: number, ts: string) {
    this.symbolToQuote.set(symbol, { symbol, price, ts });
  }

  snapshot(symbols: string[]): Record<string, QuoteTick | null> {
    const out: Record<string, QuoteTick | null> = {};
    for (const s of symbols) out[s] = this.symbolToQuote.get(s) || null;
    return out;
  }
}

// Fan-out publisher with batching
class QuotePublisher {
  private subscribers = new Map<WebSocket, Set<string>>();
  private pending = new Map<string, QuoteTick>(); // symbol -> latest tick in current batch
  private flushInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly flushMs: number;
  private readonly heartbeatMs: number;

  constructor(private store: QuoteStore, flushMs = 50, heartbeatMs = 15000) {
    this.flushMs = flushMs;
    this.heartbeatMs = heartbeatMs;
  }

  addSubscriber(ws: WebSocket, symbols: string[]) {
    this.subscribers.set(ws, new Set(symbols));
  }

  updateSubscription(ws: WebSocket, symbols: string[]) {
    const set = this.subscribers.get(ws) || new Set<string>();
    set.clear();
    for (const s of symbols) set.add(s);
    this.subscribers.set(ws, set);
  }

  removeSubscriber(ws: WebSocket) {
    this.subscribers.delete(ws);
  }

  publish(symbol: string, price: number, ts: string) {
    this.store.upsert(symbol, price, ts);
    this.pending.set(symbol, { symbol, price, ts });
  }

  start() {
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => this.flush(), this.flushMs);
    }
    if (!this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => this.pingAll(), this.heartbeatMs);
    }
  }

  stop() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.flushInterval = null;
    this.heartbeatInterval = null;
  }

  private flush() {
    if (this.pending.size === 0 || this.subscribers.size === 0) return;

    // Build a symbol->tick map to filter per subscriber efficiently
    const batch = this.pending;
    this.pending = new Map();

    for (const [ws, subs] of this.subscribers) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const payload: QuoteTick[] = [];
      for (const symbol of subs) {
        const tick = batch.get(symbol);
        if (tick) payload.push(tick);
      }
      if (payload.length > 0) {
        try {
          ws.send(JSON.stringify({ type: "quotes", items: payload }));
        } catch {}
      }
    }
  }

  private pingAll() {
    for (const ws of this.subscribers.keys()) {
      try {
        // ws ping/pong built-in keeps connections alive; track isAlive on pong
        // If client hasn't responded, close
        // We'll rely on ws heartbeat recommendation
        // Send ping; ws will emit 'pong' automatically if client responds
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      } catch {}
    }
  }
}

export const quoteStore = new QuoteStore();
export const quotePublisher = new QuotePublisher(quoteStore);

// WebSocket server wiring
export function attachQuoteWSServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws/quotes" });

  quotePublisher.start();

  wss.on("connection", (ws: WebSocket) => {
    // default empty subscription
    quotePublisher.addSubscriber(ws, []);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg && msg.type === "subscribe" && Array.isArray(msg.symbols)) {
          const uniq = Array.from(new Set<string>(msg.symbols.map((s: string) => String(s))));
          quotePublisher.updateSubscription(ws, uniq);
          ws.send(JSON.stringify({ type: "subscribed", symbols: uniq }));
        }
      } catch {}
    });

    ws.on("pong", () => {
      // could track isAlive if we wanted stricter timeout handling
    });

    ws.on("close", () => {
      quotePublisher.removeSubscriber(ws);
    });

    ws.on("error", () => {
      try { ws.close(); } catch {}
      quotePublisher.removeSubscriber(ws);
    });

    // Send an initial ack
    try { ws.send(JSON.stringify({ type: "hello" })); } catch {}
  });

  return wss;
}

// Random quote generator (in-process)
let genTimer: NodeJS.Timeout | null = null;
export function startRandomQuoteGenerator(opts?: { symbols?: string[]; ratePerSec?: number; jitterPct?: number }) {
  const symbols = opts?.symbols || [
    "AAPL","MSFT","GOOG","AMZN","META","NVDA","TSLA","AMD","NFLX","INTC"
  ];
  const baseRate = Math.max(1, Math.min(1000, Math.floor(opts?.ratePerSec || 20))); // updates/sec aggregate
  const jitterPct = Math.max(0, Math.min(1, opts?.jitterPct ?? 0.2));

  if (genTimer) clearInterval(genTimer);

  const rng = mulberry32(42);
  const priceMap = new Map<string, number>();
  for (const s of symbols) priceMap.set(s, 100 + Math.floor(rng() * 200));

  const tick = () => {
    // Determine number of updates this tick (~ every 1000/baseRate ms)
    const now = new Date().toISOString();
    const updates = Math.max(1, Math.floor(baseRate / 10)); // avg across 100ms slices
    for (let i = 0; i < updates; i++) {
      const s = symbols[Math.floor(rng() * symbols.length)];
      const last = priceMap.get(s) || 100;
      const delta = (rng() - 0.5) * 2; // -1..1
      const next = Math.max(1, Number((last + delta).toFixed(2)));
      priceMap.set(s, next);
      quotePublisher.publish(s, next, now);
    }
  };

  const intervalMs = Math.max(10, Math.floor(1000 / Math.max(1, baseRate)));
  genTimer = setInterval(tick, intervalMs);
  return { running: true, symbols, intervalMs };
}

export function stopRandomQuoteGenerator() {
  if (genTimer) clearInterval(genTimer);
  genTimer = null;
}

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
