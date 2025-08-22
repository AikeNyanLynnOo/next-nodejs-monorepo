
## Supported routes

### Seed (in-memory)
- POST `http://localhost:3001/dev/seed?users=U&orders=O&products=P`
  - Example:
    - `curl -X POST "http://localhost:3001/dev/seed?users=50000&orders=500000&products=10000"`

### Users
- GET `http://localhost:3001/api/users`
  - Query params:
    - `page` (number, 1-based)
    - `pageSize` (number, default 50, max 200)
    - `search` (string; matches name/email substring)
    - `sortBy` (`name|email|createdAt|orderTotal|orderCount`)
    - `sortDir` (`asc|desc`)
  - Response:
    - `{ items: UserRow[], total: number, page: number, pageSize: number }`
    - `UserRow = { id, name, email, createdAt, orderCount, orderTotal }`

### User Orders
- GET `http://localhost:3001/api/users/:id/orders`
  - Query params:
    - `page` (number, 1-based)
    - `pageSize` (number, default 50, max 200)
  - Response:
    - `{ items: Order[], total: number, page: number, pageSize: number }`

## Notes
- Data is stored in memory and resets on server restart.

