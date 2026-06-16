# 🏔️ Stay Alaya

A full-stack PG listing and discovery platform for Sikkim, India.

---

## 🚀 Quick Start (Frontend Only — No Backend Needed)

The frontend works **completely standalone** using localStorage mock data.

```bash
cd client
npm install
npm run dev
```

Open → http://localhost:5173

### Demo Login Credentials

| Role  | Email              | Password |
| ----- | ------------------ | -------- |
| Admin | admin@sikkimpg.com | admin123 |
| Owner | owner@sikkimpg.com | owner123 |
| User  | user@sikkimpg.com  | user123  |

---

## 🗂️ Project Structure

```
sikkim-pg-finder/
├── client/          ← React + Vite frontend
└── server/          ← Node.js + Express backend
```

---

## 🔧 Full Stack Setup (Frontend + Backend)

### Step 1 — Set up MongoDB

**Option A: MongoDB Atlas (Free Cloud)**

1. Go to https://www.mongodb.com/atlas
2. Create a free account and cluster
3. Click **Connect → Drivers** and copy the URI:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/sikkimpgfinder`

**Option B: Local MongoDB**

1. Install MongoDB Community: https://www.mongodb.com/try/download/community
2. Start it: `mongod --dbpath /data/db`
3. URI: `mongodb://localhost:27017/sikkimpgfinder`

---

### Step 2 — Set up Cloudinary (Free Image Hosting)

1. Go to https://cloudinary.com and create a free account
2. From your **Dashboard**, copy:
   - Cloud Name
   - API Key
   - API Secret

---

### Step 3 — Configure Backend `.env`

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/sikkimpgfinder
JWT_SECRET=change_this_to_a_long_random_string_in_production
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Optional — for password reset emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

> **JWT_SECRET tip**: Generate a strong secret:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

### Step 4 — Start Backend

```bash
cd server
npm install
npm run seed      # Populate database with mock data
npm run dev       # Start server on http://localhost:5000
```

Verify: http://localhost:5000/api/health should return `{ "status": "OK" }`

---

### Step 5 — Connect Frontend to Backend

```bash
cd client
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

The app now uses the real backend instead of mock data.

---

## 🌐 Environment Variables Reference

### `server/.env`

| Variable                | Description                     | Required |
| ----------------------- | ------------------------------- | -------- |
| `PORT`                  | Server port (default 5000)      | No       |
| `MONGODB_URI`           | MongoDB connection string       | ✅ Yes   |
| `JWT_SECRET`            | Secret key for JWT signing      | ✅ Yes   |
| `JWT_EXPIRES_IN`        | Token expiry (e.g. `7d`, `30d`) | No       |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name           | ✅ Yes   |
| `CLOUDINARY_API_KEY`    | Cloudinary API key              | ✅ Yes   |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret           | ✅ Yes   |
| `CLIENT_URL`            | Frontend URL for CORS           | ✅ Yes   |
| `SMTP_HOST`             | SMTP host for emails            | No       |
| `SMTP_PORT`             | SMTP port (587 for TLS)         | No       |
| `SMTP_USER`             | SMTP username/email             | No       |
| `SMTP_PASS`             | SMTP password / app password    | No       |
| `NODE_ENV`              | `development` or `production`   | No       |

### `client/.env`

| Variable       | Description          | Required       |
| -------------- | -------------------- | -------------- |
| `VITE_API_URL` | Backend API base URL | No (uses mock) |

---

## 📡 API Endpoints

### Auth

```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me             🔒
POST   /api/auth/logout         🔒
POST   /api/auth/forgot-password
PUT    /api/auth/reset-password/:token
```

### PGs (Public)

```
GET    /api/pgs                 (filters: city, minPrice, maxPrice, roomType, gender, amenities, sort, page)
GET    /api/pgs/:id
```

### Owner

```
GET    /api/owner/pgs           🔒 owner
POST   /api/owner/pgs           🔒 owner  (multipart/form-data with images[])
PUT    /api/owner/pgs/:id       🔒 owner
DELETE /api/owner/pgs/:id       🔒 owner
```

### Admin

```
GET    /api/admin/stats         🔒 admin
GET    /api/admin/pgs           🔒 admin
PUT    /api/admin/pgs/:id/approve   🔒 admin
PUT    /api/admin/pgs/:id/reject    🔒 admin
DELETE /api/admin/pgs/:id       🔒 admin
GET    /api/admin/users         🔒 admin
PUT    /api/admin/users/:id/approve-owner  🔒 admin
PUT    /api/admin/users/:id/block          🔒 admin
GET    /api/admin/reports       🔒 admin
PUT    /api/admin/reports/:id   🔒 admin
```

### User

```
POST   /api/user/save/:pgId     🔒
GET    /api/user/saved          🔒
POST   /api/user/request-owner  🔒
PUT    /api/user/profile        🔒
PUT    /api/user/change-password 🔒
```

### Reviews

```
GET    /api/reviews/:pgId
POST   /api/reviews/:pgId       🔒
DELETE /api/reviews/:reviewId   🔒
```

### Notifications

```
GET    /api/notifications       🔒 admin
PUT    /api/notifications/mark-read  🔒 admin
GET    /api/notifications/unread-count  🔒 admin
PUT    /api/notifications/:id/read  🔒 admin
```

### Reports

```
POST   /api/reports/:pgId       🔒
```

---

## 🔌 Real-time Socket.io Events

### Client → Server

```js
socket.emit("join_admin"); // Admin joins admin room
socket.emit("join_user", userId); // User joins personal room
```

### Server → Client

```js
// To admin room
socket.on("new_notification", { notification, unreadCount });

// To specific owner
socket.on("pg_status_update", { pgId, title, status, rejectionReason });

// To specific user
socket.on("owner_approved", { message });
```

---

## 🏗️ Tech Stack

### Frontend

- React 18 + Vite
- Tailwind CSS + @tailwindcss/forms
- React Router DOM v6
- React Hook Form
- React Hot Toast
- Lucide React
- Axios + Socket.io-client

### Backend

- Node.js + Express.js
- MongoDB + Mongoose
- JWT + bcryptjs
- Cloudinary + Multer
- Socket.io
- Express Validator
- Helmet + CORS + Morgan

---

## 📦 Production Deployment

### Backend (e.g. Railway, Render, Fly.io)

1. Push `server/` folder
2. Set all environment variables in dashboard
3. Build command: `npm install`
4. Start command: `npm start`

### Frontend (e.g. Vercel, Netlify)

1. Push `client/` folder
2. Set `VITE_API_URL` to your deployed backend URL
3. Build command: `npm run build`
4. Output directory: `dist`
