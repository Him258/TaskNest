# TaskNest - Multi-Tenant Project Management & Collaboration System

TaskNest is a high-performance, enterprise-grade multi-tenant project management and collaboration platform built with **Node.js, Express, MongoDB (Mongoose), React (Vite), Socket.IO, and Tailwind CSS**.

Designed to scale efficiently for 100k+ tasks, 10k+ users, and 1k+ organizations, TaskNest enforces **strict server-side role-based access control (RBAC)**, multi-tenant data isolation, real-time WebSocket updates, automated deadline notifications, and full audit logging.

---

## 🚀 Features

- **Multi-Tenant Architecture**: Complete data isolation per organization. Users can belong to multiple organizations with independent roles.
- **Strict Server-Side RBAC**: Every request verifies database membership via `requireOrgRole` middleware. Frontend UI conditionally adapts for UX, but backend strictly enforces security contracts.
- **Interactive Kanban Board**: 4 columns (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) powered by `@hello-pangea/dnd` with real-time drag-and-drop synchronization via WebSockets.
- **Advanced Task Search & Filtering**: Multi-param filtering (status, priority, assignee, labels, due date range, created date range, text search) with server-side pagination and 300ms debouncing.
- **Task Detail & Collaboration**: Rich task drawer with sub-fields, attachments, comments with `@mention` auto-notifications, and task-specific activity history.
- **Real-Time WebSockets (Socket.IO)**: Authenticated via JWT. Automatically broadcasts `task:created`, `task:updated`, `task:deleted` to project rooms (`project:<id>`) and `notification:new` to user rooms (`user:<id>`).
- **Comprehensive Audit Trail**: Automated logging for task creations, status updates, assignee changes, priority changes, member additions, and removals. Accessible to `ADMIN` and `OWNER` roles.
- **Automated Deadline Notifications**: Hourly `node-cron` job inspecting upcoming task deadlines (< 24 hours) and triggering real-time alerts.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO, Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, `node-cron`
- **Frontend**: React 18 (Vite), Tailwind CSS (v4), Axios, Socket.IO Client, `@hello-pangea/dnd`, Lucide Icons
- **Database**: MongoDB (with indexed compound schemas and text indexes)

---

## 📁 Directory Structure

```text
TaskNest/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection config
│   │   ├── controllers/     # Auth, Org, Project, Task, Comment, Audit, Notification controllers
│   │   ├── middleware/      # JWT Protect & requireOrgRole RBAC middleware
│   │   ├── models/          # User, Organization, Membership, Project, Task, Comment, AuditLog, Notification
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # node-cron deadline checking service
│   │   ├── sockets/         # Socket.IO JWT auth & room management
│   │   ├── utils/           # Audit logger & Notification helpers
│   │   ├── seed.js          # Database seed script
│   │   ├── test-api.js      # Automated backend API integration tests
│   │   └── server.js        # Express HTTP & Socket.IO server entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, KanbanBoard, TaskCard, TaskDetailModal, SearchFilterBar, etc.
│   │   ├── context/         # AuthContext & NotificationContext
│   │   ├── pages/           # LoginPage, DashboardPage, MembersPage, AuditLogsPage
│   │   ├── services/        # Axios API instance & Socket.IO client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind CSS & custom design system
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🔑 Permission Matrix

| Action / Permission | VIEWER | MEMBER | ADMIN | OWNER |
| :--- | :---: | :---: | :---: | :---: |
| View Projects & Tasks | ✅ | ✅ | ✅ | ✅ |
| View Comments & Activity | ✅ | ✅ | ✅ | ✅ |
| Create Tasks | ❌ | ✅ | ✅ | ✅ |
| Edit Assigned Tasks | ❌ | ✅ | ✅ | ✅ |
| Edit Any Task | ❌ | ❌ | ✅ | ✅ |
| Comment on Tasks | ❌ | ✅ | ✅ | ✅ |
| Create Projects | ❌ | ✅ | ✅ | ✅ |
| Delete Tasks | ❌ | ❌ | ✅ | ✅ |
| Manage Org Members | ❌ | ❌ | ✅ | ✅ |
| View Audit Logs | ❌ | ❌ | ✅ | ✅ |
| Full Org Management | ❌ | ❌ | ❌ | ✅ |

*Note: Returns `403 Forbidden` for any unauthorized backend action.*

---

## ⚡ Real-Time Architecture (Socket.IO)

1. **Authentication**: Handshake validates JWT token attached in `auth.token` or query string. Attaches verified user context to socket instance.
2. **Room Management**:
   - `user:<userId>`: Automatically joined on connection. Receives targeted notifications (`notification:new`).
   - `project:<projectId>`: Joined when viewing a project board. Broadcasts task updates (`task:created`, `task:updated`, `task:deleted`) to all active project viewers.
3. **Event Flow**:
   ```mermaid
   graph TD
     Client[React Client] -- Action (e.g. Move Task) --> API[Express API]
     API -- Verify RBAC & Save DB --> DB[(MongoDB)]
     API -- Log Audit & Notify --> Audit[Audit & Notification Services]
     API -- Socket Emit to project:id --> SocketIO[Socket.IO Server]
     SocketIO -- task:updated --> ConnectedClients[All Project Viewers]
   ```

---

## ⚡ Indexing Strategy (Performance at Scale)

To ensure sub-millisecond query performance across 100k+ tasks, 10k+ users, and 1k+ organizations, TaskNest uses targeted indexes:

| Collection | Index Schema | Purpose & Served Query |
| :--- | :--- | :--- |
| **Membership** | `{ user: 1, organization: 1 }` *(Unique)* | Prevents duplicate user memberships in an org; powers instant user-org membership check on every API request in `requireOrgRole`. |
| **Membership** | `{ organization: 1, role: 1 }` | Serves organization member roster listing (`GET /api/organizations/:id/members`) and role filter queries. |
| **Task** | `{ organization: 1, project: 1, status: 1 }` | Optimizes loading Kanban columns for a project within an organization. |
| **Task** | `{ organization: 1, assignee: 1, status: 1 }` | Serves queries filtering tasks assigned to a specific user by status within an org. |
| **Task** | `{ organization: 1, priority: 1, dueDate: 1 }` | Powers sorting and range filtering by priority and deadline dates. |
| **Task** | `{ organization: 1, createdAt: -1 }` | Serves default reverse-chronological pagination for organization task feeds. |
| **Task** | `{ labels: 1 }` | Speeds up tag-based filtering across task records. |
| **Task** | `{ title: "text", description: "text" }` *(Text Index)* | Powers full-text keyword search across task titles and descriptions. |
| **AuditLog** | `{ organization: 1, createdAt: -1 }` | Powers fast chronological audit trail pagination for organization admins. |
| **AuditLog** | `{ organization: 1, entity: 1, entityId: 1 }` | Accelerates fetching complete activity history for a specific task or project. |
| **Notification** | `{ user: 1, read: 1, createdAt: -1 }` | Powers instant unread count badge calculation and sorted notification feeds. |

---

## 🚀 Optimization & Prevention of N+1 Queries

- **`.lean()` Execution**: All read queries execute with `.lean()` to bypass Mongoose document hydration overhead, returning plain JavaScript objects for maximum speed and lower memory footprint.
- **Selective Field Projection (`.select()`)**: API responses project only required fields (e.g. `name email` for user references), avoiding massive payload overhead.
- **Population Control**: Populate references strictly with selected fields (`populate('assignee', 'name email')`) to avoid fetching password hashes or bloated user metadata.
- **Batch Processing**: No N+1 queries in loops; batch references are fetched in single MongoDB `$in` queries where applicable.

---

## ⚙️ Setup & Installation Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI

### 1. Backend Setup
```bash
cd backend
npm install
```
Ensure `.env` exists in `/backend`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tasknest
JWT_SECRET=tasknest_super_secret_jwt_key_2026_safe_and_secure
NODE_ENV=development
```

### 2. Seed Database
Run the seed script to populate demo users, organizations, projects, and 20 sample tasks:
```bash
npm run seed
```

**Seeded Demo Accounts (Password: `123456`)**:
- 👑 **Owner**: `owner@test.com` (Owner in Company A, Admin in Company B)
- 🛡️ **Admin**: `admin@test.com` (Admin in Company A, Owner in Company B)
- 👤 **Member**: `member@test.com` (Member in Company A, Viewer in Company B)
- 👁️ **Viewer**: `viewer@test.com` (Viewer in Company A)

### 3. Run Backend Server & API Verification Tests
```bash
# Start backend server
npm start

# Run API test suite
npm run test:api
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```
Ensure `.env` exists in `/frontend`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
Run the frontend development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 API Reference

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & get JWT token
- `GET /api/auth/me` - Get current authenticated user profile

### Organizations
- `POST /api/organizations` - Create organization (auto-assigns `OWNER` role)
- `GET /api/organizations` - List user's organizations with roles
- `GET /api/organizations/:id/members` - List organization members
- `POST /api/organizations/:id/members` - Add member by email/userId and role
- `DELETE /api/organizations/:id/members/:userId` - Remove member from org
- `PATCH /api/organizations/:id/members/:userId` - Update member role

### Projects
- `POST /api/projects` - Create project in organization
- `GET /api/projects?organizationId=` - List projects in organization
- `GET /api/projects/:id` - Get single project details

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Advanced task search & multi-param filtering with pagination
- `GET /api/tasks/:id` - Get task details by ID
- `PUT /api/tasks/:id` - Update task (status, priority, assignee, due date, etc.)
- `DELETE /api/tasks/:id` - Delete task (ADMIN/OWNER only)

### Comments
- `POST /api/tasks/:id/comments` - Add comment with `@mention` auto-notifications
- `GET /api/tasks/:id/comments` - List comments for task

### Audit Logs
- `GET /api/audit-logs` - Query audit logs with action, entity, user, date range filters (ADMIN/OWNER only)

### Notifications
- `GET /api/notifications` - Get unread count & user notifications feed
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all notifications as read

---

## 🔮 Future Improvements

1. **S3 File Uploads**: Integrate AWS S3 or Cloudinary for drag-and-drop file attachment uploads.
2. **Subtasks & Dependencies**: Support hierarchical task lists and task dependency blocking.
3. **Analytics Dashboard**: Add velocity charts, cumulative flow diagrams, and user workload distribution analytics.
4. **OAuth 2.0 / SSO**: Add Google Workspace and GitHub OAuth login integrations.
