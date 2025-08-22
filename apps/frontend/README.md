## Frontend deep-linking (DataTable)

You can control the table via URL query params:

- page: `?page=2`
- pageSize: `&pageSize=100`
- search: `&search=john`
- sortBy: `&sortBy=id|name|email|orderTotal|orderCount|createdAt`
- sortDir: `&sortDir=asc|desc`

Example:

`/` → `/?page=3&pageSize=100&search=doe&sortBy=orderTotal&sortDir=desc`

---

## Org Chart / File Explorer (Frontend)

### Setup
1) Ensure the backend is running at `http://localhost:3001` and seeded:
```
curl -X POST "http://localhost:3001/dev/seed?users=1000&orders=0&products=0&breadth=5&depth=3"
```
2) Create `apps/frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
3) Start the frontend:
```
pnpm dev
```

### Component Location
- `src/components/OrgChart.tsx`
- Rendered from `src/app/page.tsx` under the "Org File Explorer" tab.

### Behavior
- **Lazy loading**: Children are requested from the backend only when a node is expanded for the first time.
- **Search**: Debounced (300ms). Matches are highlighted; branches containing matches are auto-expanded.
- **Expand/collapse**: Maintains a Set of expanded node ids. Clicking a chevron toggles a single node.
- **Rendering**: Uses a Map for nodes; only visible branches are rendered for minimal re-renders.
- **Reset**:
  - Clearing the search input collapses all nodes (all chevrons reset to closed/right).
  - Clicking "Refresh" collapses all nodes and reloads root nodes.

### API Endpoints used
- `GET ${NEXT_PUBLIC_API_URL}/nodes/root` – load root nodes
- `GET ${NEXT_PUBLIC_API_URL}/nodes/:id/children` – load direct children
- `GET ${NEXT_PUBLIC_API_URL}/search?q=...&limit=100` – search with path for auto-expansion

### Notes
- The frontend does not assume a fixed depth; it expands on demand based on user action or search paths.
- If you see no nodes, seed the backend tree first with `/dev/seed?breadth=...&depth=...`.

### Next improvement
- Support for keyboard navigation