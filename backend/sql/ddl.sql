-- =====================================================================
--  HOTEL RESERVATION SYSTEM — DDL (Phase 3 schema)
--  PostgreSQL 14+
--  Run order: ddl.sql → functions_triggers_indexes.sql → seed.py
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ---------- 1. USERS (supertype) ----------
CREATE TABLE users (
    user_id    SERIAL       PRIMARY KEY,
    first_name VARCHAR(60)  NOT NULL,
    last_name  VARCHAR(60)  NOT NULL,
    phone      VARCHAR(25),
    email      VARCHAR(120) NOT NULL UNIQUE
);

-- ---------- 2. LOGIN (1:1 with users — credentials) ----------
CREATE TABLE login (
    user_id  INT          PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    login    VARCHAR(50)  NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- ---------- 3. ADMINS (subtype of users) ----------
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    user_id  INT    NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- 4. HOTELS ----------
CREATE TABLE hotels (
    hotel_id   SERIAL       PRIMARY KEY,
    hotel_name VARCHAR(150) NOT NULL,
    added_by   INT          REFERENCES admins(admin_id) ON DELETE SET NULL,
    phone      VARCHAR(25),
    email      VARCHAR(120),
    address    VARCHAR(255) NOT NULL,
    city       VARCHAR(80)  NOT NULL,
    country    VARCHAR(80)  NOT NULL
);

-- ---------- 5. CUSTOMERS (subtype of users) ----------
CREATE TABLE customers (
    customer_id SERIAL      PRIMARY KEY,
    user_id     INT         NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    passport    VARCHAR(40) UNIQUE
);

-- ---------- 6. EMPLOYEES (subtype of users) ----------
CREATE TABLE employees (
    employee_id   SERIAL      PRIMARY KEY,
    user_id       INT         NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    works_at      INT         NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    role          VARCHAR(20) NOT NULL
                  CHECK (role IN ('management','receptionist','maintenance')),
    hire_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
    supervisor_id INT         REFERENCES employees(employee_id) ON DELETE SET NULL
);

-- ---------- 7. OVERNIGHT ROOMS ----------
CREATE TABLE overnight_rooms (
    overnight_room_number INT           NOT NULL,
    hotel_id              INT           NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    price                 NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    capacity              INT           NOT NULL CHECK (capacity > 0),
    status                VARCHAR(10)   NOT NULL DEFAULT 'available'
                          CHECK (status IN ('available','taken')),
    PRIMARY KEY (overnight_room_number, hotel_id)
);

-- ---------- 8. MEETING ROOMS ----------
CREATE TABLE meeting_rooms (
    meeting_room_number INT           NOT NULL,
    hotel_id            INT           NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    hourly_rate         NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
    capacity            INT           NOT NULL CHECK (capacity > 0),
    status              VARCHAR(10)   NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','taken')),
    equipment           TEXT,
    PRIMARY KEY (meeting_room_number, hotel_id)
);

-- ---------- 9. SERVICES (PK: hotel_id + service_name) ----------
CREATE TABLE services (
    hotel_id     INT           NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    service_name VARCHAR(100)  NOT NULL,
    charge       NUMERIC(8,2)  NOT NULL CHECK (charge >= 0),
    PRIMARY KEY (hotel_id, service_name)
);

-- ---------- 10. RESERVATIONS ----------
CREATE TABLE reservations (
    reservation_id     SERIAL      PRIMARY KEY,
    customer_id        INT         NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    reservation_date   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reservation_status VARCHAR(15) NOT NULL DEFAULT 'on_hold'
                       CHECK (reservation_status IN ('confirmed','on_hold','rejected','completed'))
);

-- ---------- 11. RESERVATION_OVERNIGHT_ROOMS (M:N) ----------
CREATE TABLE reservation_overnight_rooms (
    reservation_id        INT  NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    overnight_room_number INT  NOT NULL,
    hotel_id              INT  NOT NULL,
    check_in              DATE NOT NULL,
    check_out             DATE NOT NULL,
    PRIMARY KEY (reservation_id, overnight_room_number, hotel_id),
    FOREIGN KEY (overnight_room_number, hotel_id)
        REFERENCES overnight_rooms(overnight_room_number, hotel_id) ON DELETE RESTRICT,
    CHECK (check_out > check_in)
);

-- ---------- 12. RESERVATION_MEETING_ROOMS (M:N) ----------
CREATE TABLE reservation_meeting_rooms (
    reservation_id      INT       NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    meeting_room_number INT       NOT NULL,
    hotel_id            INT       NOT NULL,
    start_time          TIMESTAMP NOT NULL,
    end_time            TIMESTAMP NOT NULL,
    PRIMARY KEY (reservation_id, meeting_room_number, hotel_id),
    FOREIGN KEY (meeting_room_number, hotel_id)
        REFERENCES meeting_rooms(meeting_room_number, hotel_id) ON DELETE RESTRICT,
    CHECK (end_time > start_time)
);

-- ---------- 13. RESERVATION_SERVICES (M:N — references composite PK of services) ----------
CREATE TABLE reservation_services (
    reservation_id INT          NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    hotel_id       INT          NOT NULL,
    service_name   VARCHAR(100) NOT NULL,
    PRIMARY KEY (reservation_id, hotel_id, service_name),
    FOREIGN KEY (hotel_id, service_name) REFERENCES services(hotel_id, service_name) ON DELETE RESTRICT
);

-- ---------- 14. REVIEWS ----------
CREATE TABLE reviews (
    review_id   SERIAL PRIMARY KEY,
    hotel_id    INT    NOT NULL REFERENCES hotels(hotel_id)       ON DELETE CASCADE,
    customer_id INT    NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    rating      INT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    date        DATE   NOT NULL DEFAULT CURRENT_DATE,
    comment     TEXT
);

-- ---------- 15. INVOICES (total is computed — not stored) ----------
CREATE TABLE invoices (
    invoice_id     SERIAL        PRIMARY KEY,
    reservation_id INT           NOT NULL UNIQUE
                   REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    discount       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax    >= 0),
    issue_date     DATE          NOT NULL DEFAULT CURRENT_DATE
);

-- ---------- 16. PAYMENTS ----------
CREATE TABLE payments (
    payment_id     SERIAL      PRIMARY KEY,
    reservation_id INT         NOT NULL UNIQUE
                   REFERENCES reservations(reservation_id) ON DELETE CASCADE,
    payment_type   VARCHAR(10) NOT NULL CHECK (payment_type IN ('credit','cash')),
    date           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status         VARCHAR(10) NOT NULL DEFAULT 'approved'
                   CHECK (status IN ('approved','denied'))
);
 