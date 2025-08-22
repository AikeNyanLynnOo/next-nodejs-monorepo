// In-memory data store and utilities
export type User = { id: number; name: string; email: string; createdAt: string };
export type Product = { id: number; name: string; price: number };
export type Order = { id: number; userId: number; productId: number; amount: number; createdAt: string };

export type Node = { 
  id: string; 
  parentId: string | null; 
  name: string; 
  hasChildren: boolean 
};

export const db = {
  users: [] as User[],
  products: [] as Product[],
  orders: [] as Order[],
  nodes: [] as Node[],
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

// Tree generation for org chart/file explorer
export function generateTree(breadth: number, depth: number): { nodes: number } {
  const rng = mulberry32(123456789);
  db.nodes.length = 0;
  
  // Prefer seeded user names; fallback to a small static list if empty
  const userNames = db.users.length
    ? db.users.map(u => u.name)
    : [
        'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Eva Davis',
        'Frank Miller', 'Grace Wilson', 'Henry Moore', 'Ivy Taylor', 'Jack Anderson',
        'Karen Thomas', 'Leo Jackson', 'Mia White', 'Noah Harris', 'Olivia Martin',
        'Paul Thompson', 'Quinn Garcia', 'Ruby Martinez', 'Sam Robinson', 'Tina Clark'
      ];
  
  function generateNode(parentId: string | null, currentDepth: number, nodeId: string): Node {
    const name = userNames[Math.floor(rng() * userNames.length)];
    const hasChildren = currentDepth < depth && Math.random() > 0.3; // 70% chance of having children
    
    return {
      id: nodeId,
      parentId,
      name: `${name} ${nodeId}`,
      hasChildren
    };
  }
  
  function generateLevel(parentId: string | null, currentDepth: number, prefix: string): void {
    if (currentDepth > depth) return;
    
    const levelBreadth = Math.min(breadth, Math.floor(breadth * (1 - currentDepth / depth)) + 1);
    
    for (let i = 0; i < levelBreadth; i++) {
      const nodeId = `${prefix}${i + 1}`;
      const node = generateNode(parentId, currentDepth, nodeId);
      db.nodes.push(node);
      
      if (node.hasChildren) {
        generateLevel(nodeId, currentDepth + 1, `${nodeId}-`);
      }
    }
  }
  
  // Generate root level
  generateLevel(null, 1, 'root');
  
  return { nodes: db.nodes.length };
}

// Helper function to get node path (ancestors)
export function getNodePath(nodeId: string): { id: string; name: string }[] {
  const path: { id: string; name: string }[] = [];
  let currentNode = db.nodes.find(n => n.id === nodeId);
  
  while (currentNode) {
    path.unshift({ id: currentNode.id, name: currentNode.name });
    if (currentNode.parentId) {
      currentNode = db.nodes.find(n => n.id === currentNode!.parentId);
    } else {
      break;
    }
  }
  
  return path;
}

export type UserRow = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  orderTotal: number;
};


