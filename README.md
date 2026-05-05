# Hotel Reservation System

A full-stack hotel booking platform built for the Database Systems course (Phase 3).  
Customers search hotels, book overnight or meeting rooms, pay, and leave reviews.  
Admins get a live dashboard with revenue stats, reservations, and analytics reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL 14+ |
| Backend | Node.js 18+ · Express · `pg` · bcryptjs · jsonwebtoken · nodemon |
| Frontend | React 18 · Vite · React Router 6 · Axios |
| Seed script | Python 3.10+ · psycopg2 · Faker · bcrypt |

---

## Project Structure

```
hotel-reservation-system/
├── backend/
│   ├── controllers/          # Business logic per resource
│   ├── db/connection.js      # PostgreSQL connection pool
│   ├── middleware/           # JWT auth + error handler
│   ├── routes/               # Express routers (11 route files)
│   ├── sql/
│   │   ├── ddl.sql                        # All 16 tables
│   │   ├── functions_triggers_indexes.sql # PL/pgSQL objects
│   │   └── queries.sql                    # Business reporting queries
│   ├── .env                  # DB credentials and JWT secret
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/              # Axios service modules
│       ├── components/       # Navbar, HotelCard, RoomCard, etc.
│       └── pages/            # 11 route-level pages
└── seed.py                   # Python data generator
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| PostgreSQL | 14+ | https://www.postgresql.org/download/ |
| Node.js | 18+ | https://nodejs.org/ |
| Python | 3.10+ | https://www.python.org/downloads/ |

---

## Step-by-Step Setup from Scratch

### Step 1 — Create the PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE hotel_reservation;"
```

Replace `postgres` with your PostgreSQL username if different.

---

### Step 2 — Configure environment variables

Open `backend/.env` and update to match your local PostgreSQL:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_reservation
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=hotel_reservation_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d
```

---

### Step 3 — Apply the schema

```bash
psql -h localhost -U <your_pg_user> -d hotel_reservation -f backend/sql/ddl.sql
```

Creates all 16 tables with constraints, foreign keys, and check constraints.

---

### Step 4 — Apply functions, triggers, and indexes

```bash
psql -h localhost -U <your_pg_user> -d hotel_reservation -f backend/sql/functions_triggers_indexes.sql
```

Creates the `calculate_invoice_total` function, `checkout_reservation` procedure, 2 triggers, and 3 indexes.

---

### Step 5 — Install Python dependencies

```bash
pip install psycopg2-binary faker bcrypt
```

---

### Step 6 — Configure seed.py

Open `seed.py` and update the `DB` dict at the top:

```python
DB = dict(host="localhost", port=5432, dbname="hotel_reservation",
          user="postgres", password="")
```

---

### Step 7 — Run the seed script

```bash
python3 seed.py
```

Generates: 1 admin · 2,000 customers · 5,000 employees · 1,000 hotels · 10,000 overnight rooms · 2,000 meeting rooms · 5,000 services · 5,000 reservations · ~3,300 invoices & payments · 2,000 reviews.

The script prints a row-count table when complete.

---

### Step 8 — Start the backend

```bash
cd backend
npm install
npm run dev        # nodemon — auto-restarts on file changes, port 5001
```

---

### Step 9 — Start the frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev        # Vite — http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Default Login Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Customer | `cust_2` (or any `cust_<id>`) | `customer123` |
| Employee | `emp_2002` (or any `emp_<id>`) | `employee123` |

To list available logins: `SELECT user_id, login FROM login LIMIT 20;`

---

## Features

**Customers**
- Browse and filter hotels by city, country, and star rating
- View hotel details: rooms, services, guest reviews
- Book overnight rooms with date-range conflict detection
- Book meeting rooms with time-slot conflict detection
- Pay by credit card or cash
- Auto-generated invoice with computed total (nights × price + services + tax − discount)
- Leave reviews for hotels after a completed stay

**Admin dashboard** (`/admin`)
- Overview cards: total revenue, hotels, reservations, customers
- Hotels table with room count and average rating
- Recent reservations with hotel name and dates
- Reports: monthly revenue, top-rated hotels, most-reserved rooms (overnight + meeting), top customers by spend, service revenue, employee list

---

## SQL Files Reference

| File | Purpose |
|---|---|
| `backend/sql/ddl.sql` | 16 tables: users, login, admins, customers, employees, hotels, overnight_rooms, meeting_rooms, services, reservations, reservation_overnight_rooms, reservation_meeting_rooms, reservation_services, reviews, invoices, payments |
| `backend/sql/functions_triggers_indexes.sql` | PL/pgSQL function (`calculate_invoice_total`), stored procedure (`checkout_reservation`), 2 triggers (T1: payment confirms reservation, T2: block delete with active reservations), 3 indexes |
| `backend/sql/queries.sql` | 12 business reporting queries (INNER/LEFT/SELF/FULL OUTER joins, correlated subqueries, EXISTS, CTEs, window functions) + EXPLAIN ANALYZE for all 3 indexes |

---

## Database Design Highlights

- **Supertype/subtype**: `users` → `customers`, `employees`, `admins`
- **Composite PKs**: `overnight_rooms(overnight_room_number, hotel_id)`, `meeting_rooms(meeting_room_number, hotel_id)`, `services(hotel_id, service_name)`
- **Computed invoice total**: stored only as `discount + tax`; line items summed live by `calculate_invoice_total()`
- **Trigger T1**: inserting an approved payment automatically sets the reservation to `confirmed`
- **Trigger T2**: prevents deleting a user who has active (`on_hold` / `confirmed`) reservations
- **Index I1** `idx_login_login`: login lookup on every authentication request
- **Index I2** `idx_overnight_rooms_hotel_status`: availability searches filter on `(hotel_id, status)`
- **Index I3** `idx_invoices_reservation_id`: accelerates invoice joins in reporting queries
