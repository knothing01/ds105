#!/usr/bin/env python3
"""
seed.py — Generate test data for the Hotel Reservation System (Phase 3).

Schema:
  users, login, admins*, customers, employees, hotels,
  overnight_rooms, meeting_rooms, services,
  reservations, reservation_overnight_rooms, reservation_meeting_rooms,
  reservation_services, invoices, payments, reviews

  * admins: creates 1 bootstrap admin if none exists (skips otherwise)

Usage:
    python3 seed.py

Dependencies:
    pip install psycopg2-binary faker bcrypt
"""

import random
import datetime
import bcrypt
import psycopg2
from psycopg2.extras import execute_values

# ── Configuration ─────────────────────────────────────────────────────────────
DB = dict(host="localhost", port=1219, dbname="hotel_reservation",
          user="michael", password="")

N_CUSTOMERS        = 2000
N_HOTELS           = 1000
N_EMPLOYEES_HOTEL  = 5      # 5 × 1000 = 5 000 employees
N_OVERNIGHT_HOTEL  = 10     # 10 × 1000 = 10 000 overnight rooms
N_MEETING_HOTEL    = 2      # 2 × 1000 = 2 000 meeting rooms
N_SERVICES_HOTEL   = 5      # 5 × 1000 = 5 000 services
N_RESERVATIONS     = 5000
N_REVIEWS_PER_CUST = 1      # at least 1 per customer → 2 000 reviews

CUSTOMER_PASSWORD  = "customer123"
EMPLOYEE_PASSWORD  = "employee123"
ADMIN_LOGIN        = "admin"
ADMIN_PASSWORD     = "admin123"

random.seed(42)
from faker import Faker
Faker.seed(42)
fake = Faker()

# ── Static lookup data ────────────────────────────────────────────────────────
HOTEL_PREFIXES = ["Grand","Royal","Imperial","Central","Plaza","Park","Oceanview",
                  "Sunset","Riverside","Skyline","Heritage","Boutique","Garden",
                  "Lakeside","Crown","Summit","Harbor","Golden","Silver","Metro"]
CITIES    = ["Paris","London","New York","Tokyo","Berlin","Madrid","Rome",
             "Vienna","Amsterdam","Prague","Yerevan","Dubai","Singapore","Toronto","Sydney"]
COUNTRIES = ["France","UK","USA","Japan","Germany","Spain","Italy",
             "Austria","Netherlands","Czechia","Armenia","UAE","Singapore","Canada","Australia"]

SERVICE_NAMES = ["Breakfast","Spa","Laundry","Room Service","Airport Transfer",
                 "Pool","Gym","Bar","Parking","Wi-Fi Premium","Late Check-out",
                 "Mini-bar","Tour Booking","Babysitting","Pet Care"]

EMP_ROLES = ["management","receptionist","receptionist","maintenance","receptionist"]

EQUIPMENT = ["Projector, Whiteboard","Projector, Video conf, Whiteboard",
             "Video conf, TV, Speakers","Projector, U-shape seating","Whiteboard, Coffee bar"]

COMMENTS = ["Excellent stay!","Very clean and comfortable.","Average experience.",
            "Will book again.","Could be better.","Staff was lovely.",
            "Great location!","Highly recommend!","Perfect for business travel.",
            "Rooms were spacious.","Great value for money.","Noise from street."]

PAY_TYPES = ["credit","cash"]


# ── Helpers ───────────────────────────────────────────────────────────────────
def hashed(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(10)).decode()


def rand_date(start="2023-01-01", end="2025-12-31") -> datetime.date:
    s = datetime.date.fromisoformat(start)
    e = datetime.date.fromisoformat(end)
    return s + datetime.timedelta(days=random.randint(0, (e - s).days))


def ev(cur, sql: str, rows: list, fetch: bool = False):
    return execute_values(cur, sql, rows, fetch=fetch)


# ── Truncation ────────────────────────────────────────────────────────────────
def truncate_tables(cur):
    print("  Clearing seeded data...")
    for t in ["reviews","payments","invoices","reservation_services",
              "reservation_meeting_rooms","reservation_overnight_rooms",
              "reservations","services","meeting_rooms","overnight_rooms",
              "employees","hotels","customers"]:
        cur.execute(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    cur.execute("""
        DELETE FROM users u
         WHERE NOT EXISTS (SELECT 1 FROM admins a WHERE a.user_id = u.user_id)
    """)


# ── Bootstrap admin ───────────────────────────────────────────────────────────
def ensure_admin(cur) -> int:
    cur.execute("SELECT admin_id FROM admins LIMIT 1")
    row = cur.fetchone()
    if row:
        print(f"  Using existing admin (admin_id={row[0]})")
        return row[0]
    print("  Creating bootstrap admin (login: admin / admin123)...")
    cur.execute(
        "INSERT INTO users(first_name,last_name,email) VALUES('Admin','User','admin@hotel.com') RETURNING user_id"
    )
    uid = cur.fetchone()[0]
    cur.execute("INSERT INTO login(user_id,login,password) VALUES(%s,%s,%s)",
                (uid, ADMIN_LOGIN, hashed(ADMIN_PASSWORD)))
    cur.execute("INSERT INTO admins(user_id) VALUES(%s) RETURNING admin_id", (uid,))
    return cur.fetchone()[0]


# ── Customers ─────────────────────────────────────────────────────────────────
def seed_customers(cur, n: int) -> list:
    pw = hashed(CUSTOMER_PASSWORD)
    user_rows = []
    for i in range(1, n + 1):
        fn, ln = fake.first_name(), fake.last_name()
        user_rows.append((fn, ln, fake.phone_number()[:25],
                          f"{fn.lower()}.{ln.lower()}{i}@example.com"))

    inserted = ev(cur,
        "INSERT INTO users(first_name,last_name,phone,email) VALUES %s RETURNING user_id",
        user_rows, fetch=True)
    user_ids = [r[0] for r in inserted]

    ev(cur, "INSERT INTO login(user_id,login,password) VALUES %s",
       [(uid, f"cust_{uid}", pw) for uid in user_ids])

    inserted_custs = ev(cur,
        "INSERT INTO customers(user_id,passport) VALUES %s RETURNING customer_id",
        [(uid, f"P{uid:08d}") for uid in user_ids], fetch=True)
    return [r[0] for r in inserted_custs]


# ── Hotels ────────────────────────────────────────────────────────────────────
def seed_hotels(cur, n: int, admin_id: int) -> list:
    rows = []
    for i in range(1, n + 1):
        idx = (i - 1) % len(CITIES)
        rows.append((
            f"{HOTEL_PREFIXES[(i-1) % len(HOTEL_PREFIXES)]} Hotel {i}",
            admin_id,
            fake.phone_number()[:25],
            f"hotel{i}@booking.test",
            f"{i} {fake.street_name()}",
            CITIES[idx],
            COUNTRIES[idx],
        ))
    result = ev(cur,
        "INSERT INTO hotels(hotel_name,added_by,phone,email,address,city,country) VALUES %s RETURNING hotel_id",
        rows, fetch=True)
    return [r[0] for r in result]


# ── Employees ─────────────────────────────────────────────────────────────────
def seed_employees(cur, hotel_ids: list, per_hotel: int):
    pw = hashed(EMPLOYEE_PASSWORD)
    BATCH = 50  # hotels per batch to limit memory

    for batch_start in range(0, len(hotel_ids), BATCH):
        batch = hotel_ids[batch_start:batch_start + BATCH]
        user_rows = []
        for hid in batch:
            for j in range(per_hotel):
                fn, ln = fake.first_name(), fake.last_name()
                user_rows.append((fn, ln, fake.phone_number()[:25],
                                  f"{fn.lower()}.{ln.lower()}.{hid}.{j}@hotel.test"))

        inserted_users = ev(cur,
            "INSERT INTO users(first_name,last_name,phone,email) VALUES %s RETURNING user_id",
            user_rows, fetch=True)
        uids = [r[0] for r in inserted_users]

        ev(cur, "INSERT INTO login(user_id,login,password) VALUES %s",
           [(uid, f"emp_{uid}", pw) for uid in uids])

        emp_rows = []
        for k, uid in enumerate(uids):
            hid = batch[k // per_hotel]
            emp_rows.append((uid, hid, EMP_ROLES[k % per_hotel],
                             rand_date("2018-01-01","2024-12-31"), None))

        ev(cur,
           "INSERT INTO employees(user_id,works_at,role,hire_date,supervisor_id) VALUES %s",
           emp_rows)

    # Wire supervisors
    cur.execute("""
        UPDATE employees e
           SET supervisor_id = mgr.employee_id
          FROM (
            SELECT DISTINCT ON (works_at) employee_id, works_at
              FROM employees WHERE role = 'management'
             ORDER BY works_at, employee_id
          ) mgr
         WHERE e.works_at     = mgr.works_at
           AND e.role        <> 'management'
           AND e.employee_id <> mgr.employee_id
    """)


# ── Overnight rooms ───────────────────────────────────────────────────────────
def seed_overnight_rooms(cur, hotel_ids: list, per_hotel: int) -> list:
    rows = []
    for hid in hotel_ids:
        for rn in range(1, per_hotel + 1):
            rows.append((rn, hid,
                         round(random.uniform(60, 500), 2),
                         random.choice([1, 2, 2, 3, 4]),
                         random.choices(["available","taken"], weights=[80,20])[0]))
    ev(cur,
       "INSERT INTO overnight_rooms(overnight_room_number,hotel_id,price,capacity,status) VALUES %s",
       rows)
    return [(r[1], r[0]) for r in rows]  # (hotel_id, room_number)


# ── Meeting rooms ─────────────────────────────────────────────────────────────
def seed_meeting_rooms(cur, hotel_ids: list, per_hotel: int) -> list:
    rows = []
    for hid in hotel_ids:
        for rn in range(1, per_hotel + 1):
            rows.append((rn, hid,
                         round(random.uniform(40, 200), 2),
                         random.choice([10, 15, 20, 30, 50]),
                         random.choices(["available","taken"], weights=[85,15])[0],
                         random.choice(EQUIPMENT)))
    ev(cur,
       "INSERT INTO meeting_rooms(meeting_room_number,hotel_id,hourly_rate,capacity,status,equipment) VALUES %s",
       rows)
    return [(r[1], r[0]) for r in rows]  # (hotel_id, room_number)


# ── Services (PK: hotel_id + service_name) ───────────────────────────────────
def seed_services(cur, hotel_ids: list, per_hotel: int) -> dict:
    """Returns dict: hotel_id -> [service_name, ...]"""
    rows = []
    by_hotel = {}
    for hid in hotel_ids:
        names = random.sample(SERVICE_NAMES, min(per_hotel, len(SERVICE_NAMES)))
        by_hotel[hid] = names
        for name in names:
            rows.append((hid, name, round(random.uniform(5, 100), 2)))
    ev(cur, "INSERT INTO services(hotel_id,service_name,charge) VALUES %s", rows)
    return by_hotel


# ── Reservations + all junction tables ───────────────────────────────────────
def seed_reservations(cur, customer_ids, overnight_rooms, meeting_rooms,
                      services_by_hotel: dict, n: int):
    statuses = ["on_hold","confirmed","confirmed","completed","completed","rejected"]

    res_rows = [(random.choice(customer_ids),
                 fake.date_time_between(start_date="-2y", end_date="now"),
                 random.choice(statuses))
                for _ in range(n)]

    result = ev(cur,
        "INSERT INTO reservations(customer_id,reservation_date,reservation_status) VALUES %s "
        "RETURNING reservation_id, reservation_status",
        res_rows, fetch=True)

    ror_rows = []
    rmr_rows = []
    rs_rows  = set()
    inv_rows = []
    pay_rows = []

    for res_id, status in result:
        if status == "rejected":
            continue

        hid = None
        use_meeting = random.random() < 0.25

        if use_meeting and meeting_rooms:
            hid, rn = random.choice(meeting_rooms)
            start = fake.date_time_between(start_date="-1y", end_date="+6m")
            end   = start + datetime.timedelta(hours=random.randint(1, 8))
            rmr_rows.append((res_id, rn, hid, start, end))
        elif overnight_rooms:
            hid, rn = random.choice(overnight_rooms)
            check_in  = rand_date("2023-01-01", "2025-12-31")
            check_out = check_in + datetime.timedelta(days=random.randint(1, 14))
            ror_rows.append((res_id, rn, hid, check_in, check_out))

        if hid:
            hotel_svcs = services_by_hotel.get(hid, [])
            for sname in random.sample(hotel_svcs,
                                       min(random.randint(0, 3), len(hotel_svcs))):
                rs_rows.add((res_id, hid, sname))

        if status in ("confirmed", "completed"):
            discount = round(random.uniform(0, 20), 2) if random.random() > 0.8 else 0.0
            tax      = round(random.uniform(10, 50), 2)
            inv_rows.append((res_id, discount, tax,
                             rand_date("2023-01-01", "2025-12-31")))
            pay_rows.append((res_id, random.choice(PAY_TYPES),
                             fake.date_time_between(start_date="-1y", end_date="now"),
                             "approved"))

    if ror_rows:
        ev(cur,
           "INSERT INTO reservation_overnight_rooms"
           "(reservation_id,overnight_room_number,hotel_id,check_in,check_out)"
           " VALUES %s ON CONFLICT DO NOTHING", ror_rows)
    if rmr_rows:
        ev(cur,
           "INSERT INTO reservation_meeting_rooms"
           "(reservation_id,meeting_room_number,hotel_id,start_time,end_time)"
           " VALUES %s ON CONFLICT DO NOTHING", rmr_rows)
    if rs_rows:
        ev(cur,
           "INSERT INTO reservation_services(reservation_id,hotel_id,service_name)"
           " VALUES %s ON CONFLICT DO NOTHING", list(rs_rows))
    if inv_rows:
        ev(cur,
           "INSERT INTO invoices(reservation_id,discount,tax,issue_date)"
           " VALUES %s ON CONFLICT DO NOTHING", inv_rows)
    if pay_rows:
        ev(cur,
           "INSERT INTO payments(reservation_id,payment_type,date,status)"
           " VALUES %s ON CONFLICT DO NOTHING", pay_rows)


# ── Reviews ───────────────────────────────────────────────────────────────────
def seed_reviews(cur, customer_ids: list, hotel_ids: list):
    seen, rows = set(), []
    hotel_cycle = hotel_ids[:]
    random.shuffle(hotel_cycle)

    for i, cid in enumerate(customer_ids):
        # Give each customer 1-2 reviews
        for _ in range(random.randint(1, 2)):
            hid = hotel_cycle[i % len(hotel_cycle)]
            i  += len(customer_ids)  # spread picks across hotels
            if (cid, hid) in seen:
                continue
            seen.add((cid, hid))
            rows.append((hid, cid, random.randint(1, 5),
                         random.choice(COMMENTS),
                         rand_date("2023-01-01", "2025-12-31")))

    ev(cur,
       "INSERT INTO reviews(hotel_id,customer_id,rating,comment,date) VALUES %s",
       rows)
    return len(rows)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        truncate_tables(cur)
        admin_id = ensure_admin(cur)

        print(f"  Seeding {N_CUSTOMERS} customers...")
        customer_ids = seed_customers(cur, N_CUSTOMERS)

        print(f"  Seeding {N_HOTELS} hotels...")
        hotel_ids = seed_hotels(cur, N_HOTELS, admin_id)

        print(f"  Seeding employees ({N_EMPLOYEES_HOTEL}/hotel = {N_HOTELS*N_EMPLOYEES_HOTEL} total)...")
        seed_employees(cur, hotel_ids, N_EMPLOYEES_HOTEL)

        print(f"  Seeding overnight rooms ({N_OVERNIGHT_HOTEL}/hotel = {N_HOTELS*N_OVERNIGHT_HOTEL} total)...")
        overnight_rooms = seed_overnight_rooms(cur, hotel_ids, N_OVERNIGHT_HOTEL)

        print(f"  Seeding meeting rooms ({N_MEETING_HOTEL}/hotel = {N_HOTELS*N_MEETING_HOTEL} total)...")
        meeting_rooms = seed_meeting_rooms(cur, hotel_ids, N_MEETING_HOTEL)

        print(f"  Seeding services ({N_SERVICES_HOTEL}/hotel = {N_HOTELS*N_SERVICES_HOTEL} total)...")
        services_by_hotel = seed_services(cur, hotel_ids, N_SERVICES_HOTEL)

        print(f"  Seeding {N_RESERVATIONS} reservations + invoices + payments...")
        seed_reservations(cur, customer_ids, overnight_rooms, meeting_rooms,
                          services_by_hotel, N_RESERVATIONS)

        print("  Seeding reviews...")
        n_reviews = seed_reviews(cur, customer_ids, hotel_ids)
        print(f"    {n_reviews} reviews inserted")

        conn.commit()

        print("\nDone! Row counts:")
        for table in ["users","login","admins","customers","employees",
                      "hotels","overnight_rooms","meeting_rooms","services",
                      "reservations","reservation_overnight_rooms",
                      "reservation_meeting_rooms","reservation_services",
                      "invoices","payments","reviews"]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"  {table:<35} {cur.fetchone()[0]:>7}")

    except Exception as exc:
        conn.rollback()
        print(f"\nERROR — rolled back.\n{exc}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
