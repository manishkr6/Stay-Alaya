# 🏔️ Stay Alaya (Sikkim PG Finder)

A modern, verified PG listing and discovery platform built specifically for students and professionals across Sikkim, India (Gangtok, Tadong, Deorali, Namchi, Majitar, and beyond).

---

## ⚡ Architecture: Pure Serverless & Direct Integration

Stay Alaya uses a streamlined **Frontend-First Architecture** with **Supabase** and **Cloudinary**. There is **no separate Node/Express or Python backend server** needed.

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Database & Realtime:** Supabase (PostgreSQL with `pgvector` for AI vector similarity search)
- **Authentication:** Supabase Auth (Email/Password, JWT sessions, RLS)
- **Security:** PostgreSQL Row Level Security (RLS) directly on tables
- **Media Storage:** Cloudinary Direct Client-Side Upload with WebP compression (`browser-image-compression`)

---

## 🚀 Quick Start

### 1. Install & Run Frontend

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 2. Environment Variables

Create `client/.env` (pre-configured with Supabase project):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://dwgflxqjzribjgdwyhmd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3Z2ZseHFqenJpYmpnZHd5aG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg3ODIsImV4cCI6MjEwNzU1NDc4Mn0.CJWybLdg6hXw5IuRw7BPMr0JKWiEM-GdjEUocMbHba4

# Cloudinary (Optional for uploads - fallbacks to local preview if not provided)
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

---

### 🔑 Admin Access

Production Admin account configured in Supabase:

| Role  | Email | Capabilities |
| ----- | ----- | ------------ |
| **Admin** | `manishkr8927@gmail.com` | Approves PG listings, verifies KYC, changes user roles, manages users & deletion requests |

Users and owners can self-register using the **Sign Up** page. Admins can promote any user to an Owner or Admin directly from the **Admin Users Management** panel (`/admin/users`) or the Supabase Dashboard.

---

## 🗄️ Database Tables (Supabase)

All application data is hosted in Supabase PostgreSQL:

- `public.profiles`: User profiles linked to `auth.users` with roles (`student`, `owner`, `admin`)
- `public.pg_listings`: PG accommodations with room types, rent, locality, amenities, and photos
- `public.saved_pgs`: User bookmarks / favorites
- `public.reviews`: Student reviews and ratings
- `public.notifications`: System alerts for verification status changes and admin updates

---

## 📦 Build for Production

```bash
cd client
npm run build
```
Generates an optimized static bundle in `client/dist`.
