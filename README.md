## Monorepo: Users Data Table Demo

This project contains:
- Backend (Express, in-memory data): `apps/backend`
- Frontend (Next.js 14): `apps/frontend`

### 1) Start backend dev server
```
cd apps/backend
pnpm install
pnpm dev
```
Backend runs at `http://localhost:3001`.

### 2) Post dummy user data (seed in memory)
With the backend running, seed any amount of data (resets on restart):
```
curl -X POST "http://localhost:3001/dev/seed?users=100&orders=0&products=0"
```
Full seed (example):
```
curl -X POST "http://localhost:3001/dev/seed?users=50000&orders=500000&products=10000"
```

Available API routes:
- `POST /dev/seed?users=U&orders=O&products=P`
- `GET /api/users?page=1&pageSize=50&search=&sortBy=orderTotal&sortDir=desc`
- `GET /api/users/:id/orders?page=1&pageSize=50`

### 3) Start frontend dev server
Set the API base URL for the frontend. Create `apps/frontend/.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
Then run:
```
cd apps/frontend
pnpm install
pnpm dev
```
Frontend runs at `http://localhost:3000`.

### 4) See the Users table
- Ensure the Home page renders the table. In `apps/frontend/src/app/page.tsx`, render the component:
```tsx
import { DataTable } from "../components/DataTable";

export default function Home() {
  return <DataTable />;
}
```
- Open `http://localhost:3000` in your browser.

Deep-linking supported on the frontend (query params):
- `?page=2` `&pageSize=100` `&search=john` `&sortBy=id|name|email|orderTotal|orderCount|createdAt` `&sortDir=asc|desc`


