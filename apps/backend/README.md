# Backend API Documentation

## Overview
Express.js backend with in-memory data store supporting users/orders, org chart/file explorer, and real-time quotes streaming.

## Endpoints

### Users & Orders

#### POST /dev/seed
Seed the database with test data.

**Query Parameters:**
- `users` (number): Number of users to create (default: 1000)
- `orders` (number): Number of orders to create (default: 10000)
- `products` (number): Number of products to create (default: 1000)
- `breadth` (number): Tree breadth for org chart (default: 20)
- `depth` (number): Tree depth for org chart (default: 10)

**Example:**
```bash
curl -X POST "http://localhost:3001/dev/seed?users=1000&orders=5000&products=100&breadth=5&depth=3"
```

**Response:**
```json
{
  "users": 1000,
  "products": 100,
  "orders": 5000,
  "nodes": 15
}
```

#### GET /api/users
Get paginated users with search and sorting.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 50, max: 200)
- `search` (string): Search term for name/email
- `sortBy` (string): Sort field (id, name, email, orderTotal, orderCount, createdAt)
- `sortDir` (string): Sort direction (asc, desc)

**Example:**
```bash
curl "http://localhost:3001/api/users?page=1&pageSize=20&search=john&sortBy=name&sortDir=asc"
```

#### GET /api/users/:id/orders
Get orders for a specific user.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 50, max: 200)

**Example:**
```bash
curl "http://localhost:3001/api/users/1/orders?page=1&pageSize=10"
```

### Org File Explorer

#### POST /dev/seed (with tree data)
Seed the database with org chart tree data.

**Query Parameters:**
- `breadth` (number): Number of children per node (default: 20)
- `depth` (number): Maximum tree depth (default: 10)

**Example:**
```bash
curl -X POST "http://localhost:3001/dev/seed?breadth=5&depth=3"
```

#### GET /api/nodes/root
Get all root-level nodes (nodes with no parent).

**Example:**
```bash
curl "http://localhost:3001/api/nodes/root"
```

**Response:**
```json
[
  {
    "id": "root1",
    "parentId": null,
    "name": "Engineering root1",
    "hasChildren": true
  },
  {
    "id": "root2",
    "parentId": null,
    "name": "Marketing root2",
    "hasChildren": false
  }
]
```

#### GET /api/nodes/:id/children
Get direct children of a specific node.

**Path Parameters:**
- `id` (string): Node ID

**Example:**
```bash
curl "http://localhost:3001/api/nodes/root1/children"
```

**Response:**
```json
[
  {
    "id": "root1-1",
    "parentId": "root1",
    "name": "Frontend root1-1",
    "hasChildren": true
  },
  {
    "id": "root1-2",
    "parentId": "root1",
    "name": "Backend root1-2",
    "hasChildren": false
  }
]
```

#### GET /api/search
Search nodes by name with path information.

**Query Parameters:**
- `q` (string): Search query (required)
- `limit` (number): Maximum results (default: 100, max: 100)

**Example:**
```bash
curl "http://localhost:3001/api/search?q=Engineering&limit=10"
```

**Response:**
```json
[
  {
    "id": "root1",
    "name": "Engineering root1",
    "path": [
      {"id": "root1", "name": "Engineering root1"}
    ]
  },
  {
    "id": "root1-1",
    "name": "Engineering root1-1",
    "path": [
      {"id": "root1", "name": "Engineering root1"},
      {"id": "root1-1", "name": "Engineering root1-1"}
    ]
  }
]
```

## Quotes (Real-time)

### Snapshot
- GET `/api/quotes/snapshot?symbols=AAPL,MSFT,GOOG`
- Returns last known price per symbol (or null if unknown)

Example:
```bash
curl "http://localhost:3001/api/quotes/snapshot?symbols=AAPL,MSFT,GOOG"
```
Response:
```json
{
  "AAPL": {"symbol":"AAPL","price":184.23,"ts":"2025-08-22T13:10:25.123Z"},
  "MSFT": {"symbol":"MSFT","price":419.5,"ts":"2025-08-22T13:10:25.123Z"},
  "GOOG": null
}
```

### WebSocket Streaming
- WS endpoint: `ws://localhost:3001/ws/quotes`

Protocol:
- Client → Server: `{"type":"subscribe","symbols":["AAPL","MSFT"]}`
- Server → Client (batched every ~50ms):
```json
{"type":"quotes","items":[{"symbol":"AAPL","price":184.25,"ts":"2025-08-22T13:10:25.456Z"}]}
```
- On subscribe ack:
```json
{"type":"subscribed","symbols":["AAPL","MSFT"]}
```

Heartbeat:
- Server sends ws ping every 15s.
- Client should respond with pong (most ws clients do this automatically).
- Idle/errored sockets are closed.

Backoff guidance:
- On close/error, clients should retry with exponential backoff (e.g., 1s, 2s, 4s, max 30s) and jitter.

Browser test:
```js
const ws = new WebSocket("ws://localhost:3001/ws/quotes");
ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", symbols: ["AAPL","MSFT"] }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

### Load Generator (Random Quotes)
Start generator (dev only):
- POST `/dev/quotes/start?rate=30&symbols=AAPL,MSFT,GOOG`
- `rate`: aggregate updates per second (10–50 recommended)

Stop generator:
- POST `/dev/quotes/stop`

### Performance Notes
- Single in-process publisher batches updates every ~50ms and fans out only the symbols each client subscribed to.
- Non-blocking: store updates and WS sends are decoupled via batching.
- Heartbeat runs independently to detect dead connections.

## Data Models

### Node
```typescript
{
  id: string;
  parentId: string | null;
  name: string;
  hasChildren: boolean;
}
```

### User
```typescript
{
  id: number;
  name: string;
  email: string;
  createdAt: string;
}
```

### Order
```typescript
{
  id: number;
  userId: number;
  productId: number;
  amount: number;
  createdAt: string;
}
```

## Development

### Start the server
```bash
npm run dev
```

### Build for production
```bash
npm run build
npm start
```

## Features

### Org File Explorer
- **Lazy Loading**: Children are loaded on-demand via `/api/nodes/:id/children`
- **Search**: Full-text search with path information for auto-expansion
- **Tree Generation**: Configurable breadth and depth for realistic test data
- **Path Resolution**: Complete ancestor paths for search results

### Users & Orders
- **Pagination**: Efficient pagination with configurable page sizes
- **Search**: Real-time search across user names and emails
- **Sorting**: Multi-field sorting with direction control
- **Aggregation**: Order counts and totals calculated on-demand

