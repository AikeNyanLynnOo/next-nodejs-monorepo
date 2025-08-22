## Monorepo: Users Data Table Demo

This project contains:
- Backend (Express, in-memory data): `apps/backend`
- Frontend (Next.js 14): `apps/frontend`

### 1) Start backend dev server
Set the API base URL for the backend. Create `apps/backend/.env.` with:
```
PORT=3001
```
Then run:
```
cd apps/backend
pnpm install
pnpm dev
```
Backend runs at `http://localhost:3001`.

### 2) Start frontend dev server
Set the API base URL for the frontend. Create `apps/frontend/.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```
Then run:
```
cd apps/frontend
pnpm install
pnpm dev
```
Frontend runs at `http://localhost:3000`.

### 4) See the Users table
- Open `http://localhost:3000` in your browser.

---

## Features Implemented

### ✅ Users Data Table
- Pagination, search, sorting
- Deep-linking with URL params
- Responsive design

### ✅ Org Chart / File Explorer
- Lazy loading of tree nodes
- Search with auto-expansion
- Highlighting of matched nodes
- Expand/collapse functionality

### ✅ Real-time Quotes Dashboard
- WebSocket connection with auto-reconnect
- Live-updating table with price changes
- Chart.js bar chart with real-time updates
- Performance optimizations (batching, memoization)

### ✅ Documentation
- Postman collection json
- Rich README.md for both FE & BE & Global One
---

## Test Cases & Small Features (Future Improvements)

Due to time constraints, the following test cases and small features were left for future implementation:

### 🧪 **Test Cases**
- **Unit Tests**: Component testing with Jest/React Testing Library
- **Integration Tests**: API endpoint testing with Supertest
- **E2E Tests**: Full user flow testing with Playwright/Cypress
- **Performance Tests**: Load testing for WebSocket connections
- **Error Handling Tests**: Network failure, malformed data scenarios

### 🔧 **Small Features**
- **Keyboard Navigation**: Arrow keys for table navigation, Enter to expand nodes
- **Data Persistence**: Save user preferences (sorting, page size, etc.)
- **Real-time Notifications**: Toast messages for connection status
- **Chart Types**: Line charts, candlestick charts for quotes
- **Search History**: Recent searches with autocomplete
- **Bulk Actions**: Select multiple users/orders for operations

### 🚀 **Performance Enhancements**
- **Virtual Scrolling**: For large datasets (100k+ records)
- **Service Workers**: Offline support and caching
- **WebSocket Compression**: Reduce bandwidth usage
- **Lazy Loading**: Code splitting for better initial load times

### 📱 **Mobile Optimizations**
- **Touch Gestures**: Swipe to navigate, pinch to zoom charts
- **Mobile-First Design**: Better responsive layouts

### 🔒 **Security & Validation**
- **Input Validation**: Client and server-side validation
- **Rate Limiting**: API request throttling
- **CORS Configuration**: Proper cross-origin settings
- **Data Sanitization**: XSS prevention

These improvements would make the application production-ready with enterprise-level features and robust testing coverage.


