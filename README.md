# Collections by Chandni

> **Discover Your Style** — A modern fashion e-commerce web platform.

This repository contains the architecture, database layer, and admin authentication for **Collections by Chandni** (**Step 3: Admin Authentication** completed).

---

## 1. Project Structure

```
collections-by-chandni/
├── client/                              # Frontend React (Vite + JavaScript)
│   ├── src/
│   │   ├── assets/                      # Brand assets & SVG logos
│   │   │   └── logo.svg
│   │   ├── components/                  # Reusable UI components
│   │   │   ├── admin/                   # Admin panel components
│   │   │   │   ├── AdminBreadcrumbs.jsx # Dynamic hierarchy breadcrumbs
│   │   │   │   ├── AdminHeader.jsx      # Top admin bar with profile & search
│   │   │   │   ├── AdminSidebar.jsx     # Responsive desktop/drawer navigation
│   │   │   │   ├── CategoryDeleteModal.jsx # Delete confirmation modal
│   │   │   │   ├── CategoryFormModal.jsx# Category create & edit modal
│   │   │   │   ├── DashboardStatCard.jsx# Reusable KPI card with trend & icon
│   │   │   │   ├── ProductDeleteModal.jsx  # Safe product delete modal
│   │   │   │   ├── ProductFormModal.jsx # Product create & edit modal
│   │   │   │   ├── RecentOrdersTable.jsx# Orders table with status badges
│   │   │   │   ├── SalesOverviewChart.jsx# Responsive monthly sales SVG chart
│   │   │   │   └── TopProductsList.jsx  # Best-selling products breakdown
│   │   │   ├── Button.jsx
│   │   │   ├── Container.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Header.jsx
│   │   ├── context/                     # Application state contexts
│   │   │   └── AuthContext.jsx          # JWT Authentication state & session restoration
│   │   ├── hooks/                       # Custom React hooks
│   │   │   └── useApi.js
│   │   ├── layouts/                     # Page layouts
│   │   │   ├── AdminLayout.jsx          # Shared Admin Panel layout (Sidebar + Header + Canvas)
│   │   │   └── MainLayout.jsx           # Storefront layout
│   │   ├── pages/                       # Page views & placeholders
│   │   │   ├── admin/                   # Admin pages
│   │   │   │   ├── AdminDashboard.jsx   # /admin authenticated dashboard
│   │   │   │   ├── AdminLogin.jsx       # /admin/login portal screen
│   │   │   │   ├── CategoryManagement.jsx # /admin/categories CRUD management
│   │   │   │   ├── ProductManagement.jsx  # /admin/products CRUD management
│   │   │   │   └── AdminPlaceholder.jsx # Placeholders for upcoming admin sections
│   │   │   ├── CartPage.jsx
│   │   │   ├── CategoriesPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── ShopPage.jsx
│   │   ├── routes/                      # Route declarations & route guards
│   │   │   ├── AppRoutes.jsx            # Router switch declaration
│   │   │   └── ProtectedRoute.jsx       # Admin role & JWT route guard
│   │   ├── services/                    # API services
│   │   │   ├── api.js                   # Unified fetch client with automatic JWT attachment
│   │   │   ├── authService.js           # Admin authentication API client
│   │   │   ├── categoryService.js       # Category CRUD API client
│   │   │   └── productService.js        # Product CRUD API client
│   │   ├── utils/                       # Helper functions
│   │   │   └── formatters.js
│   │   ├── App.jsx                      # App root component with AuthProvider
│   │   ├── index.css                    # Typography & Tailwind CSS styles
│   │   └── main.jsx                     # React 19 entry point
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                              # Backend Express.js (Node.js ES Modules)
│   ├── prisma/
│   │   ├── migrations/                  # Generated PostgreSQL migrations
│   │   │   ├── 20260929000000_init/
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   ├── schema.prisma                # Database schema (Models & Relations)
│   │   └── seed.js                      # Database seed script (Admin, Categories, Products)
│   ├── src/
│   │   ├── config/                      # Environment & database client config
│   │   │   ├── db.js                    # Prisma client singleton
│   │   │   └── env.js                   # Environment config loader
│   │   ├── controllers/                 # Route controllers
│   │   │   ├── authController.js        # Admin login, /me, and logout
│   │   │   ├── categoryController.js    # Category CRUD handlers
│   │   │   ├── productController.js     # Product CRUD handlers
│   │   │   └── healthController.js      # System & database health checks
│   │   ├── middleware/                  # Custom middlewares
│   │   │   ├── authMiddleware.js        # authenticateToken, requireAdmin & optionalAuth guards
│   │   │   ├── errorHandler.js          # Central error & 404 handlers
│   │   │   └── logger.js                # Request logger
│   │   ├── routes/                      # Modular routers
│   │   │   ├── authRoutes.js            # /api/auth routes
│   │   │   ├── categoryRoutes.js        # /api/categories routes
│   │   │   ├── productRoutes.js         # /api/products routes
│   │   │   ├── healthRoutes.js          # /api/health routes
│   │   │   └── index.js                 # Router aggregator
│   │   ├── services/                    # Business logic layer
│   │   │   ├── authService.js           # Admin authentication & credentials validation
│   │   │   ├── categoryService.js       # Category hierarchy, slug & referential logic
│   │   │   ├── productService.js        # Product catalog, filter & safety logic
│   │   │   └── healthService.js         # Diagnostics & DB connectivity check
│   │   ├── utils/                       # Security & formatting utilities
│   │   │   ├── jwt.js                   # Token generation & verification
│   │   │   ├── password.js              # Bcrypt hashing & verification
│   │   │   └── response.js              # Standardized API response formatters
│   │   └── server.js                    # Express app & listener
│   ├── .env.example
│   └── package.json
│
├── prisma/
│   └── schema.prisma                    # Root Prisma schema
├── .env.example                         # Root environment configuration
├── package.json                         # Project package configuration
├── server.js                            # Full-stack integration runner (Express + Vite)
└── README.md                            # Project documentation
```

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, JavaScript (JSX), React Router 7, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js (ES Modules), CORS, Dotenv
- **Authentication**: JWT (`jsonwebtoken`), `bcryptjs`
- **Database & ORM**: PostgreSQL, Prisma ORM 6.4.1

---

## 3. How Authentication Works

1. **Password Security**: Passwords are never stored as plain text. The backend hashes passwords using `bcryptjs` (with 10 salt rounds).
2. **Admin Credentials Validation**:
   - `email` and `password` are validated for presence and email format.
   - User is located by email in PostgreSQL via Prisma.
   - Password is confirmed using `bcrypt.compare`.
   - Role is strictly validated (`user.role === 'ADMIN'`). If a customer credentials match, HTTP 403 `Admin access required` is returned.
   - If credentials are invalid, generic HTTP 401 `Invalid email or password` is returned without leaking account existence.
3. **Stateless JWT**:
   - Token payload contains only non-sensitive claims: `{ userId, role }`.
   - Signed using `JWT_SECRET` with configurable expiration (`JWT_EXPIRES_IN=1d`).
4. **Middleware Architecture**:
   - `authenticateToken`: Inspects the `Authorization: Bearer <token>` header, verifies the signature, and attaches `req.user` to the request.
   - `requireAdmin`: Reusable authorization guard ensuring `req.user.role === 'ADMIN'`.
5. **Frontend State & Route Protection**:
   - `AuthContext`: Holds `user`, `token`, `isAuthenticated`, and `loading`.
   - On application mount, `AuthContext` checks stored token and validates with `GET /api/auth/me`. If invalid or expired, the session is cleared.
   - `ProtectedRoute`: Guards `/admin` and sub-routes. Unauthenticated requests are redirected to `/admin/login`.
   - `apiRequest`: Unified API service automatically injects `Authorization: Bearer <token>` on all outbound requests.

---

## 4. Environment Variables

Create `.env` (in project root) or `server/.env` based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# PostgreSQL Connection String for Prisma ORM
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/collections_by_chandni"

# JWT Authentication Configuration
JWT_SECRET="collections_by_chandni_jwt_dev_secret_key_2026_super_secure"
JWT_EXPIRES_IN="1d"
```

> ⚠️ In production, set `JWT_SECRET` to a cryptographically secure random string and use HttpOnly/Secure cookies for hardened token transport.

---

## 5. Demo Admin Credentials

> ⚠️ **DEMO DEVELOPMENT CREDENTIALS ONLY** — Must be changed before deploying to production!

- **Email**: `admin@collectionsbychandni.in`
- **Password**: `Admin@123`
- **Role**: `ADMIN`
- **Admin Login Portal**: `http://localhost:3000/admin/login`

---

## 6. API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/admin/login` | Authenticates admin and returns JWT | No | `200` (Success), `401` (Invalid), `403` (Non-admin) |
| `GET` | `/api/auth/me` | Fetches authenticated user profile | Yes (`Bearer <token>`) | `200` (Success), `401` (Unauthorized) |
| `POST` | `/api/auth/logout` | Client notification to clear session | No | `200` |

#### Admin Login Request Example:
```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@collectionsbychandni.in","password":"Admin@123"}'
```
#### Admin Login Response:
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "user": {
      "id": "admin-seed-uuid-1",
      "name": "Collections by Chandni Admin",
      "email": "admin@collectionsbychandni.in",
      "role": "ADMIN"
    }
  }
}
```

### Category Endpoints (Step 5)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | List categories with search, pagination, status, and parentId filters | No |
| `GET` | `/api/categories/:id` | Get category by ID with parent, children, and count relations | No |
| `POST` | `/api/categories` | Create new category (auto-slug generation, duplicate check) | Yes (`ADMIN`) |
| `PUT` | `/api/categories/:id` | Update category details (cycle & self-parenting prevention) | Yes (`ADMIN`) |
| `PATCH` | `/api/categories/:id/status` | Activate or deactivate category (`{ "isActive": boolean }`) | Yes (`ADMIN`) |
| `DELETE` | `/api/categories/:id` | Delete unused category (returns 409 if products or subcategories exist) | Yes (`ADMIN`) |

### Product Endpoints (Step 6)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | List products with search, category, status, featured, sort, and pagination filters | Public (Active only for guests; all for `ADMIN`) |
| `GET` | `/api/products/:id` | Get product details with category, images, and variants | Public (Active only for guests; all for `ADMIN`) |
| `POST` | `/api/products` | Create product (validates category, auto-generates slug) | Yes (`ADMIN`) |
| `PUT` | `/api/products/:id` | Update product details (re-generates slug if title changes) | Yes (`ADMIN`) |
| `PATCH` | `/api/products/:id/status` | Activate or deactivate product (`{ "isActive": boolean }`) | Yes (`ADMIN`) |
| `DELETE` | `/api/products/:id` | Safe product delete (returns 409 if order history exists) | Yes (`ADMIN`) |

### Health & Diagnostics Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | General backend server health check |
| `GET` | `/api/health/db` | PostgreSQL database connection health check |

---

## 7. How to Run the Application

### Option A: Unified Full-Stack Server (Recommended)

Starts both Express API and Vite React client on a single port:

```bash
npm run dev
```

- **Storefront**: `http://localhost:3000`
- **Admin Login**: `http://localhost:3000/admin/login`
- **Admin Dashboard**: `http://localhost:3000/admin` (Protected)
- **API Health**: `http://localhost:3000/api/health`
- **DB Health**: `http://localhost:3000/api/health/db`

### Option B: Standalone Servers

**Backend:**
```bash
cd server
npm run dev
```
> Running on `http://localhost:5000`

**Frontend:**
```bash
cd client
npm run dev
```
> Running on `http://localhost:3000` (proxies `/api` to `http://localhost:5000`)

---

## 8. Database Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply Migrations
npm run prisma:migrate

# Seed Database (Idempotent: Admin, Categories, Demo Products)
npm run db:seed
```

---

## 9. Verification Tests Completed

1. **Correct Admin Login**: `admin@collectionsbychandni.in` + `Admin@123` returns `200` with signed JWT and sanitized admin user object.
2. **Wrong Password**: Returns HTTP `401` with generic `Invalid email or password`.
3. **Unknown Email**: Returns HTTP `401` with generic `Invalid email or password`.
4. **Customer Login Attempt**: Customer accounts return HTTP `403` with `Admin access required`.
5. **`/api/auth/me` without Token**: Returns HTTP `401` with `Authentication required`.
6. **`/api/auth/me` with Valid Token**: Returns HTTP `200` with admin profile (`passwordHash` excluded).
7. **`/api/auth/me` with Invalid Token**: Returns HTTP `401` with `Authentication required`.
8. **Protected Route `/admin`**: Redirects to `/admin/login` when unauthenticated.
9. **Admin Dashboard Logout**: Clears authentication state, purges token, and navigates to `/admin/login`.
10. **Zero TypeScript Files**: Codebase is pure JavaScript (`.js` and `.jsx`).
11. **Admin Layout & Navigation**: Responsive desktop sidebar and mobile drawer with backdrop overlay.
12. **Dashboard Stat Cards**: 4 reusable KPI cards with demo indicators.
13. **Sales Overview Chart**: Responsive interactive monthly chart with demo metrics.
14. **Recent Orders & Top Products**: Boutique fashion sample tables with fulfillment status badges and responsive horizontal overflow protection.
15. **Placeholder Management Modules**: Administrative routes properly secured and wrapped in `AdminLayout`.
16. **Category CRUD Operations**: View, create parent/child, edit, search, and activate/deactivate categories.
17. **Referential Integrity & Cycle Prevention**: HTTP 409 rejection for categories containing products/children, circular parent checks, and unique slug validation.
18. **Product Management Foundation**: Complete CRUD for fashion catalog items with category association, brand selection, featured toggles, status management, and price range derived from variants.
19. **Order History Safety**: Protected destructive deletion (HTTP 409 Conflict) for items linked to historical orders, public active-only scoping, and unique slug generation.
20. **Product Variants CRUD & Validations**: Endpoints for variant retrieval, creation, updating, activation/deactivation, and safe deletion. Price validations (selling price <= MRP, non-negative), unique SKU enforcement, and duplicate size/color prevention per product.
21. **Stock Adjustment & Inventory Control**: Multi-mode stock adjustments (SET, INCREASE, DECREASE) with audit logging into `InventoryAdjustment`, negative stock prevention, and real-time calculation previews.
22. **Inventory Dashboard & Stock KPIs**: Dedicated `/admin/inventory` page with KPI summary cards (Total Variants, Units in Stock, Low Stock Warnings, Out of Stock), category filters, status filters, search, and sorting.
23. **Product Variations Management Modal**: Dedicated modal inside Product Management allowing admins to view, add, edit, adjust stock, and manage all variations for each specific garment.

---

**STEP 7 IS COMPLETE.** Product Variants and Inventory Management implemented. Ready for your instructions on STEP 8.

