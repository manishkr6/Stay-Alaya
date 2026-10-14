# Sikkim PG Finder – Migration Plan
**MERN (Node/Express/MongoDB) + FastAPI ➔ React + Supabase + Cloudinary + FastAPI**

---

## 1. Executive Summary & Architecture Overview

The **Sikkim PG Finder** platform is being modernized from a legacy hybrid architecture (Node/Express/MongoDB + FastAPI) into a streamlined, high-performance architecture:
- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide React (`@supabase/supabase-js`, `browser-image-compression`).
- **Database & Auth & Realtime:** Supabase (PostgreSQL with `pgvector`, Row Level Security, RPC functions, and Supabase Auth).
- **Media Asset Storage:** **Cloudinary** exclusively (client-side compression via `browser-image-compression` to WebP, saving direct HTTPS URLs to Supabase Postgres). Supabase Storage is **NOT** used.
- **AI Semantic & Natural Language Search:** **FastAPI Microservice** dedicated exclusively to vector embedding generation and semantic similarity matching using Supabase's `match_verified_pgs` RPC function.
- **Removed Feature:** Real-time customer-to-owner chat/messaging and Socket.io have been **completely eliminated** in favor of direct communication channels (verified phone call & WhatsApp).

```
                      +------------------------------------------+
                      |         React 18 + Vite Client           |
                      |   (browser-image-compression, WebP)      |
                      +----+-------------------+------------+----+
                           |                   |            |
             Direct Upload |                   | Supabase   | Natural Language
               (Images/KYC)|                   | JS Client  | AI Query & Embedding
                           v                   v            v
                   +---------------+   +---------------+  +------------------+
                   |  Cloudinary   |   |   Supabase    |  | FastAPI Service  |
                   | Media Storage |   |  (Postgres,   |  | (AI Vector       |
                   | (Rooms & KYC) |   |  Auth, RLS,   |  |  Embedding &     |
                   |               |   |   pgvector)   |  |  Search Engine)  |
                   +-------+-------+   +-------+-------+  +--------+---------+
                           |                   ^                   |
                           | secure_url        | RPC match_verified_pgs
                           +-------------------+-------------------+
```

---

## 2. Frontend Inventory: Pages, Components, Forms & Routes

### A. Pages & Routes
| Route | Component | Access Level | Description |
|---|---|---|---|
| `/` | `Home.jsx` | Public | Hero search bar, Sikkim district shortcuts (Gangtok, Namchi, etc.), verified highlights, stats, testimonials |
| `/find-pg` | `FindPG.jsx` | Public | Full discovery view: locality/area search, rent range, room type, gender, amenities, sorting, pagination |
| `/pg/:id` | `PGDetails.jsx` | Public | Detailed PG overview, photo carousel, amenities list, house rules, location map, owner contact (Phone, WhatsApp), reviews & review submission |
| `/about` | `About.jsx` | Public | Platform mission, Sikkim local context, features, and safety guidelines |
| `/login` | `Login.jsx` | Public | Email and password authentication with redirect handling |
| `/signup` | `Signup.jsx` | Public | Registration with role selection (`student` / `owner`), full name, phone number, and password |
| `/forgot-password` | `ForgotPassword.jsx` | Public | Email submission to trigger Supabase password reset link |
| `/reset-password` | `ResetPassword.jsx` | Public (via recovery link) | Secure new password update via `supabase.auth.updateUser` |
| `/verify-otp` | `OtpVerification.jsx` | Deprecated | Legacy OTP screen; replaced by standard Supabase email verification flow |
| `/list-your-pg` | `ListYourPG.jsx` | Authenticated | Landlord onboarding / KYC verification submission (full name, phone, property deed/agreement, government ID) |
| `/dashboard` | `Dashboard.jsx` | Authenticated (Student/User) | Profile management, quick links to saved PGs, user reviews history, owner upgrade status |
| `/saved-pgs` | `SavedPGs.jsx` | Authenticated | Grid of bookmarked accommodations saved by the user |
| `/notifications` | `Notifications.jsx` | Authenticated | System notifications list (KYC status updates, listing verification notices) |
| `/owner` | `owner/OwnerDashboard.jsx` | Authenticated (`owner`, `admin`) | Landlord listing dashboard: property cards, verification status badges, edit, delete request |
| `/owner/add` | `owner/AddPG.jsx` | Authenticated (`owner`, `admin`) | Form to create a new PG listing with multi-image Cloudinary upload, geolocation auto-fill |
| `/owner/edit/:id` | `owner/EditPG.jsx` | Authenticated (`owner`, `admin`) | Update existing PG details and images |
| `/admin` | `admin/AdminLayout.jsx` | Authenticated (`admin`) | Admin portal sidebar wrapper |
| `/admin` (index) | `admin/AdminDashboard.jsx` | Authenticated (`admin`) | High-level metrics: total PGs, pending listings, verified PGs, registered users, pending KYC |
| `/admin/pending` | `admin/AdminPending.jsx` | Authenticated (`admin`) | Queue for reviewing new submissions, update requests, and delete requests with approve/reject reasons |
| `/admin/pgs` | `admin/AdminAllPGs.jsx` | Authenticated (`admin`) | Directory of all PG listings with search, filter, and administrative deletion |
| `/admin/users` | `admin/AdminUsers.jsx` | Authenticated (`admin`) | User management table: role assignment, KYC document viewing (Cloudinary links), approve owner status, block/unblock |
| `/admin/notifications` | `admin/AdminNotifications.jsx` | Authenticated (`admin`) | Admin notification center |
| ~`/messages`~ | ~`Messages.jsx`~ | **DELETED** | Customer-to-owner chat completely removed |

### B. Shared & UI Components
- **`Navbar.jsx`**: Global navigation, mobile responsive drawer, user profile dropdown, notification badge, saved PGs shortcut. *(Chat icon and badge completely removed)*.
- **`Footer.jsx`**: District links (Gangtok, Singtam, Namchi, Jorethang, Gyalshing, Mangan, Ravangla, Pakyong, Rangpo), contact information, legal links.
- **`ProtectedRoute.jsx`**: Route guard checking user authentication and allowed roles (`student`, `owner`, `admin`).
- **`SearchBar.jsx`**: Hero search component with district dropdown and price budget selector.
- **`PGCard.jsx`**: Listing card showcasing primary image, verified shield, title, locality, rent per month, room type, gender preference, and bookmark toggle.
- **`VerifiedBadge.jsx`**: Trust marker showing verification status.
- **`StatusPill.jsx`**: Listing state indicator (`Approved`, `Pending`, `Rejected`, `Pending Update`, `Pending Delete`).
- **`Modal.jsx`**: Reusable accessible dialog for confirmation actions and rejection reasons.
- **`SkeletonCard.jsx` / `EmptyState.jsx` / `Pagination.jsx` / `StarRating.jsx`**: Polish and utility UI components.

### C. Forms & Data Inputs
1. **User Sign Up:** Full name, email, phone number, password, role (`student` or `owner`).
2. **User Sign In:** Email and password.
3. **Forgot & Reset Password:** Email input for reset email; new password input.
4. **Owner KYC Submission:** Full Name, Phone Number, Property Document (PDF/Image), Identity Document (PDF/Image).
5. **PG Listing Submission / Edit:**
   - Title, Description, Rent (Price), Deposit.
   - City (District hub), Area (Locality e.g. Tadong, Deorali), Address.
   - Room Type (`Single`, `Double`, `Triple`, `Four+`).
   - Gender Preference (`Boys`, `Girls`, `Co-ed`).
   - Amenities array (`WiFi`, `Food`, `AC`, `Parking`, `Laundry`, `CCTV`, `Water`, `Gym`).
   - Rules array (multiline text split into strings).
   - Images array (up to 6 room photos uploaded to Cloudinary).
   - Contact Number (for direct Phone & WhatsApp contact).

---

## 3. Code Cleanup: Exact Files Identified for Deletion

### A. Frontend Deletions (Completed in Phase 1)
- `client/src/pages/Messages.jsx` -> **Deleted**.
- `socket.io-client` package in `client/package.json` -> **Uninstalled & removed**.
- Cleaned up imports, state, and UI buttons from:
  - `client/src/App.jsx` (removed `/messages` route and import).
  - `client/src/components/layout/Navbar.jsx` (removed message icon, badge, and mobile drawer link).
  - `client/src/pages/PGDetails.jsx` (removed "Chat in App" button; preserved Phone and WhatsApp).
  - `client/src/pages/owner/OwnerDashboard.jsx` (removed Messages button and chat unread pill).
  - `client/src/pages/admin/AdminUsers.jsx` (removed "Chat" action button from user table).
  - `client/src/context/DataContext.jsx` (removed `chatUnreadCount`, `fetchChatUnreadCount`, `getChatUnreadCount`).

### B. Backend Deletions (Completed in Phase 1)
1. **Chat & Messaging Modules (Deleted):**
   - `backend/app/controllers/chat_controller.py` -> **Deleted**.
   - `backend/app/routes/chat_routes.py` -> **Deleted**.
   - `backend/app/schemas/chat.py` -> **Deleted**.
   - `backend/package-lock.json` -> **Deleted** (unused empty npm lockfile).
   - Removed `chat_router` from `backend/app/routes/__init__.py`.
   - Removed `CONVERSATIONS` & `MESSAGES` from `backend/app/models/collections.py`.
   - Removed chat filter queries from `notification_controller.py` and `notification_service.py`.

### C. Obsolete Backend Modules Scheduled for Deletion (Phase 5)
2. **Obsolete MongoDB & Express Replica Controllers (Moving to Direct Supabase):**
   - `backend/app/controllers/auth_controller.py` (Supabase Auth replaces custom JWT/OTP)
   - `backend/app/controllers/owner_controller.py` (Supabase RLS replaces server controller)
   - `backend/app/controllers/admin_controller.py` (Supabase RLS replaces admin controller)
   - `backend/app/controllers/user_controller.py` (Supabase RLS replaces user controller)
   - `backend/app/controllers/pg_controller.py` (Replaced by direct Supabase queries)
   - `backend/app/controllers/review_controller.py` (Replaced by Supabase queries)
   - `backend/app/controllers/notification_controller.py` (Replaced by Supabase queries)
   - `backend/app/controllers/report_controller.py`
3. **Obsolete Routes:**
   - `backend/app/routes/auth_routes.py`
   - `backend/app/routes/owner_routes.py`
   - `backend/app/routes/admin_routes.py`
   - `backend/app/routes/user_routes.py`
   - `backend/app/routes/pg_routes.py`
   - `backend/app/routes/review_routes.py`
   - `backend/app/routes/notification_routes.py`
   - `backend/app/routes/report_routes.py`
4. **Obsolete Infrastructure & Services:**
   - `backend/app/config/db.py` (MongoDB Motor connection)
   - `backend/app/models/collections.py` & `backend/app/models/enums.py`
   - `backend/app/services/email_service.py` (Supabase Auth delivers emails natively)
   - `backend/app/services/cloudinary_service.py` (Frontend uploads directly to Cloudinary)
   - `backend/app/services/auth_service.py` & `backend/app/services/notification_service.py`
   - `backend/app/utils/bson_utils.py`
5. **Obsolete Python Dependencies in `requirements.txt`:**
   - Remove: `motor`, `python-jose`, `passlib`, `email-validator`.
   - Keep/Add: `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `supabase`, `sentence-transformers` (or Gemini embedding client).

---

## 4. Step-by-Step Mapping: Database Tables & Schema (PostgreSQL on Supabase)

### Table 1: `profiles` (extends `auth.users`)
| Column Name | PostgreSQL Data Type | Constraints & Defaults | Frontend Field / Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` | Auth User UID |
| `full_name` | `text` | `NOT NULL` | User full name (`name`) |
| `email` | `text` | `NOT NULL UNIQUE` | User email |
| `phone` | `text` | `NULLABLE` | Contact phone number |
| `role` | `text` | `NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'owner', 'admin'))` | User role |
| `kyc_status` | `text` | `NOT NULL DEFAULT 'unsubmitted' CHECK (kyc_status IN ('unsubmitted', 'pending', 'verified', 'rejected'))` | Landlord KYC progress |
| `kyc_doc_url` | `text` | `NULLABLE` | Cloudinary URL: Property deed / tax receipt / agreement |
| `kyc_id_doc_url` | `text` | `NULLABLE` | Cloudinary URL: Aadhaar / Voter ID / Govt ID |
| `is_blocked` | `boolean` | `NOT NULL DEFAULT false` | Account block status |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Registration timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last update timestamp |

> **Trigger `on_auth_user_created`**:
> An automatic PostgreSQL trigger on `auth.users` creates the row in `public.profiles` taking `full_name`, `phone`, and `role` from `raw_user_meta_data`.

---

### Table 2: `pg_listings`
| Column Name | PostgreSQL Data Type | Constraints & Defaults | Frontend Field / Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | PG identifier (`pg.id`) |
| `owner_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | References Landlord `profiles.id` |
| `title` | `text` | `NOT NULL` | Listing title (e.g. "Green Hill PG for Girls") |
| `description` | `text` | `NULLABLE` | Detailed overview and amenities description |
| `locality` | `text` | `NOT NULL` | District hub / Area (`Gangtok`, `Tadong`, `Deorali`, `Namchi`, etc.) |
| `address` | `text` | `NOT NULL` | Exact street address |
| `rent` | `numeric` | `NOT NULL CHECK (rent >= 0)` | Monthly rent (`price`) |
| `deposit` | `numeric` | `NOT NULL DEFAULT 0 CHECK (deposit >= 0)` | Security deposit |
| `room_type` | `text` | `NOT NULL CHECK (room_type IN ('Single', 'Double', 'Triple', 'Four+'))` | Room sharing capacity |
| `gender_preference` | `text` | `NOT NULL CHECK (gender_preference IN ('Boys', 'Girls', 'Co-ed', 'Any'))` | Tenant gender preference |
| `amenities` | `text[]` | `NOT NULL DEFAULT '{}'` | Array of amenities (`WiFi`, `Food`, `AC`, `Parking`, etc.) |
| `rules` | `text[]` | `NOT NULL DEFAULT '{}'` | Array of house rules |
| `images` | `text[]` | `NOT NULL DEFAULT '{}'` | Array of Cloudinary WebP image URLs |
| `contact_number` | `text` | `NOT NULL` | Landlord phone number for direct Call & WhatsApp |
| `kyc_doc_url` | `text` | `NULLABLE` | Specific property ownership document URL |
| `is_verified` | `boolean` | `NOT NULL DEFAULT false` | Admin approval flag (Public searches only see `true`) |
| `is_available` | `boolean` | `NOT NULL DEFAULT true` | Availability toggle |
| `status` | `text` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'pending_update', 'pending_delete'))` | Workflow status |
| `rejection_reason` | `text` | `NULLABLE` | Admin feedback if rejected |
| `delete_request_reason` | `text` | `NULLABLE` | Reason provided by owner for delete request |
| `embedding` | `vector(384)` | `NULLABLE` | Dense vector embedding for AI natural language search |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update timestamp |

---

### Table 3: `saved_pgs` (Bookmarks / Wishlist)
| Column Name | PostgreSQL Data Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Record ID |
| `user_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Student/User saving the PG |
| `pg_id` | `uuid` | `NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE` | Saved PG listing |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Bookmark timestamp |
| *Constraint* | `UNIQUE(user_id, pg_id)` | Prevents duplicate bookmarks |

---

### Table 4: `reviews`
| Column Name | PostgreSQL Data Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Review ID |
| `pg_id` | `uuid` | `NOT NULL REFERENCES pg_listings(id) ON DELETE CASCADE` | Rated PG listing |
| `user_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Review author |
| `rating` | `integer` | `NOT NULL CHECK (rating >= 1 AND rating <= 5)` | Star rating |
| `comment` | `text` | `NOT NULL` | Review message |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Review timestamp |

---

### Table 5: `notifications`
| Column Name | PostgreSQL Data Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Notification ID |
| `user_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Target recipient |
| `message` | `text` | `NOT NULL` | Notification text |
| `type` | `text` | `NOT NULL DEFAULT 'info'` | Category (`info`, `success`, `alert`) |
| `related_id` | `text` | `NULLABLE` | Related entity ID (e.g. PG ID) |
| `is_read` | `boolean` | `NOT NULL DEFAULT false` | Read status |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Timestamp |

---

## 5. PostgreSQL RPC Function: Hybrid AI Vector Search (`match_verified_pgs`)

```sql
create or replace function match_verified_pgs (
  query_embedding vector(384),
  match_threshold float default 0.2,
  match_count int default 10,
  filter_max_rent numeric default null,
  filter_locality text default null
)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  locality text,
  address text,
  rent numeric,
  deposit numeric,
  room_type text,
  gender_preference text,
  amenities text[],
  rules text[],
  images text[],
  contact_number text,
  is_verified boolean,
  is_available boolean,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.locality,
    p.address,
    p.rent,
    p.deposit,
    p.room_type,
    p.gender_preference,
    p.amenities,
    p.rules,
    p.images,
    p.contact_number,
    p.is_verified,
    p.is_available,
    1 - (p.embedding <=> query_embedding) as similarity
  from pg_listings p
  where p.is_verified = true
    and p.is_available = true
    and (filter_max_rent is null or p.rent <= filter_max_rent)
    and (filter_locality is null or p.locality ilike '%' || filter_locality || '%')
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## 6. Row Level Security (RLS) Policy Blueprint

1. **`profiles`:**
   - `SELECT`: Public can view basic profile info (owner name); users can view their own profile; admins can view all.
   - `UPDATE`: Users can update their own profile; admins can update any profile (e.g. `kyc_status`, `role`, `is_blocked`).
2. **`pg_listings`:**
   - `SELECT`: Anyone (including anon) can view listings where `is_verified = true`.
   - `SELECT (Owner)`: Authenticated users can view all their own listings regardless of status.
   - `SELECT (Admin)`: Authenticated `admin` users can view all listings (pending, rejected, verified).
   - `INSERT (Owner)`: Authenticated users with role `owner` or `admin` can insert listings where `owner_id = auth.uid()`.
   - `UPDATE (Owner)`: Owners can update their own listings (`owner_id = auth.uid()`).
   - `UPDATE (Admin)`: Admins can update any listing (`is_verified`, `status`, `rejection_reason`).
   - `DELETE (Owner/Admin)`: Owners can delete their own listings; admins can delete any listing.
3. **`saved_pgs`:**
   - `SELECT / INSERT / DELETE`: Users can only view, add, and remove their own saved PGs (`user_id = auth.uid()`).
4. **`reviews`:**
   - `SELECT`: Anyone can view reviews for verified PGs.
   - `INSERT`: Authenticated users can create a review (`user_id = auth.uid()`).
   - `DELETE`: Author of review or Admin can delete.
5. **`notifications`:**
   - `SELECT / UPDATE`: Users can only read and mark as read their own notifications (`user_id = auth.uid()`).

---

## 7. Migration Execution Phases & Verification Gates

- [x] **Phase 1: Codebase Audit, Chat Removal & Documentation (`MIGRATION_PLAN.md`)**
  - Audited React client, FastAPI service, and previous architecture.
  - Removed `Messages.jsx`, uninstalled `socket.io-client`, removed chat UI buttons/badges/routes.
  - Verified React build succeeds cleanly with 0 broken imports.
  - Created `MIGRATION_PLAN.md`.
- [ ] **Phase 2: Database Schema & `pgvector` Setup via Supabase MCP**
  - Enable `vector` extension.
  - Create tables (`profiles`, `pg_listings`, `saved_pgs`, `reviews`, `notifications`), triggers, and RLS policies.
  - Deploy `match_verified_pgs` RPC function.
  - Verify schema using `list_tables` on Supabase MCP.
- [ ] **Phase 3: Cloudinary Client-Side Compression & Upload Utility**
  - Install `browser-image-compression` and `@supabase/supabase-js`.
  - Create `src/lib/supabaseClient.js`.
  - Create `src/utils/cloudinaryUpload.js` (WebP compression, folder separation `sikkim_pg_rooms` / `sikkim_pg_kyc`, PDF pass-through).
- [ ] **Phase 4: Frontend Integration (Auth, Password Reset, CRUD & Admin KYC)**
  - Integrate Supabase Auth (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`).
  - Wire Add/Edit PG to Cloudinary upload + Supabase `pg_listings`.
  - Wire Admin KYC review & listing approvals.
  - Connect standard filters and search bar to Supabase.
- [ ] **Phase 5: Rewire FastAPI AI Search to Supabase & Delete Old Backend Modules**
  - Update FastAPI to query Supabase via `pgvector` RPC.
  - Remove obsolete Express/Mongo replica modules, controllers, routes, and packages.
  - Final end-to-end verification and build test.
