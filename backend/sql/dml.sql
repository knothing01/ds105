-- =====================================================================
--  DML — Hotel Reservation System (Phase 3)
--  Sample data covering all 16 tables.
--  Run order: ddl.sql → functions_triggers_indexes.sql → dml.sql
--
--  Credentials inserted:
--    admin     login: admin        password: admin123
--    customer  login: cust_1       password: customer123
--    customer  login: cust_2       password: customer123
--    customer  login: cust_3       password: customer123
--    employee  login: emp_1        password: employee123
--    employee  login: emp_2        password: employee123
-- =====================================================================


-- =====================================================================
--  1. USERS
-- =====================================================================
INSERT INTO users (first_name, last_name, phone, email) VALUES
  ('Alice',   'Admin',    '+1-800-000-0001', 'alice.admin@hotelco.com'),   -- user_id 1
  ('Bob',     'Brown',    '+1-800-000-0002', 'bob.brown@mail.com'),        -- user_id 2
  ('Carol',   'Carter',   '+1-800-000-0003', 'carol.carter@mail.com'),     -- user_id 3
  ('David',   'Davis',    '+1-800-000-0004', 'david.davis@mail.com'),      -- user_id 4
  ('Eve',     'Evans',    '+1-800-000-0005', 'eve.evans@mail.com'),        -- user_id 5
  ('Frank',   'Foster',   '+1-800-000-0006', 'frank.foster@mail.com');     -- user_id 6


-- =====================================================================
--  2. LOGIN
--  Passwords (bcrypt, cost 10):
--    admin123    → $2a$10$U1stFh6shZp1xpgYnO/28ud04UKwZnTvBwquKGS3ud7UXhIm3OhDi
--    customer123 → $2a$10$VlmhNi1FFl7nBKF6qoL0N.kAHg4hOfe2SrvZ0sG1Z6nawQtIpMwVi
--    employee123 → $2a$10$lpOkleoEH4FUjsF6oINfz.JlJiKCk0dvO4oWyRmeEITqJU5gU2F4a
-- =====================================================================
INSERT INTO login (user_id, login, password) VALUES
  (1, 'admin',  '$2a$10$U1stFh6shZp1xpgYnO/28ud04UKwZnTvBwquKGS3ud7UXhIm3OhDi'),
  (2, 'cust_1', '$2a$10$VlmhNi1FFl7nBKF6qoL0N.kAHg4hOfe2SrvZ0sG1Z6nawQtIpMwVi'),
  (3, 'cust_2', '$2a$10$VlmhNi1FFl7nBKF6qoL0N.kAHg4hOfe2SrvZ0sG1Z6nawQtIpMwVi'),
  (4, 'cust_3', '$2a$10$VlmhNi1FFl7nBKF6qoL0N.kAHg4hOfe2SrvZ0sG1Z6nawQtIpMwVi'),
  (5, 'emp_1',  '$2a$10$lpOkleoEH4FUjsF6oINfz.JlJiKCk0dvO4oWyRmeEITqJU5gU2F4a'),
  (6, 'emp_2',  '$2a$10$lpOkleoEH4FUjsF6oINfz.JlJiKCk0dvO4oWyRmeEITqJU5gU2F4a');


-- =====================================================================
--  3. ADMINS  (subtype of users)
-- =====================================================================
INSERT INTO admins (user_id) VALUES (1);  -- admin_id 1


-- =====================================================================
--  4. HOTELS
-- =====================================================================
INSERT INTO hotels (hotel_name, added_by, phone, email, address, city, country) VALUES
  ('Grand Palace Hotel',  1, '+1-212-555-0101', 'info@grandpalace.com',
   '5th Avenue 100',       'New York',    'USA'),          -- hotel_id 1
  ('Seaside Resort',      1, '+44-20-555-0202', 'info@seasideresort.com',
   'Ocean Drive 88',       'Miami',       'USA'),          -- hotel_id 2
  ('Alpine Lodge',        1, '+33-1-555-0303',  'info@alpinelodge.com',
   'Mountain Road 12',     'Innsbruck',   'Austria');      -- hotel_id 3


-- =====================================================================
--  5. CUSTOMERS  (subtype of users)
-- =====================================================================
INSERT INTO customers (user_id, passport) VALUES
  (2, 'US-PASS-10001'),   -- customer_id 1
  (3, 'US-PASS-10002'),   -- customer_id 2
  (4, 'US-PASS-10003');   -- customer_id 3


-- =====================================================================
--  6. EMPLOYEES  (subtype of users)
-- =====================================================================
INSERT INTO employees (user_id, works_at, role, hire_date, supervisor_id) VALUES
  (5, 1, 'management',   '2022-01-10', NULL),   -- employee_id 1 (manager at hotel 1)
  (6, 1, 'receptionist', '2023-03-15', 1);      -- employee_id 2 (reports to emp 1)


-- =====================================================================
--  7. OVERNIGHT ROOMS
-- =====================================================================
INSERT INTO overnight_rooms (overnight_room_number, hotel_id, price, capacity, status) VALUES
  (101, 1, 120.00, 1, 'available'),
  (102, 1, 150.00, 2, 'available'),
  (103, 1, 200.00, 4, 'available'),
  (201, 2,  95.00, 1, 'available'),
  (202, 2, 130.00, 2, 'available'),
  (101, 3, 180.00, 2, 'available'),
  (102, 3, 220.00, 4, 'available');


-- =====================================================================
--  8. MEETING ROOMS
-- =====================================================================
INSERT INTO meeting_rooms (meeting_room_number, hotel_id, hourly_rate, capacity, status, equipment) VALUES
  (1, 1, 80.00,  10, 'available', 'Projector, Whiteboard'),
  (2, 1, 120.00, 20, 'available', 'Projector, Video conferencing'),
  (1, 2, 60.00,   8, 'available', 'Whiteboard'),
  (1, 3, 90.00,  15, 'available', 'Projector, Whiteboard, TV screen');


-- =====================================================================
--  9. SERVICES  (PK: hotel_id + service_name)
-- =====================================================================
INSERT INTO services (hotel_id, service_name, charge) VALUES
  (1, 'Breakfast',        25.00),
  (1, 'Airport Transfer', 50.00),
  (1, 'Spa Access',       40.00),
  (2, 'Breakfast',        20.00),
  (2, 'Beach Umbrella',   15.00),
  (3, 'Breakfast',        22.00),
  (3, 'Ski Equipment',    60.00);


-- =====================================================================
--  10. RESERVATIONS
-- =====================================================================
INSERT INTO reservations (customer_id, reservation_date, reservation_status) VALUES
  (1, '2025-01-10 09:00:00', 'completed'),   -- reservation_id 1
  (2, '2025-02-14 14:30:00', 'completed'),   -- reservation_id 2
  (3, '2025-03-05 11:00:00', 'confirmed'),   -- reservation_id 3
  (1, '2025-04-20 16:00:00', 'on_hold'),     -- reservation_id 4
  (2, '2025-05-01 10:00:00', 'completed');   -- reservation_id 5


-- =====================================================================
--  11. RESERVATION_OVERNIGHT_ROOMS
-- =====================================================================
INSERT INTO reservation_overnight_rooms
  (reservation_id, overnight_room_number, hotel_id, check_in, check_out) VALUES
  (1, 101, 1, '2025-01-15', '2025-01-18'),   -- 3 nights, $120/night
  (2, 202, 2, '2025-02-20', '2025-02-23'),   -- 3 nights, $130/night
  (3, 101, 3, '2025-03-10', '2025-03-14'),   -- 4 nights, $180/night
  (4, 102, 1, '2025-04-25', '2025-04-27'),   -- 2 nights, $150/night
  (5, 201, 2, '2025-05-05', '2025-05-08');   -- 3 nights, $95/night


-- =====================================================================
--  12. RESERVATION_MEETING_ROOMS
-- =====================================================================
INSERT INTO reservation_meeting_rooms
  (reservation_id, meeting_room_number, hotel_id, start_time, end_time) VALUES
  (1, 1, 1, '2025-01-16 09:00:00', '2025-01-16 12:00:00'),  -- 3 hrs, $80/hr
  (3, 1, 3, '2025-03-11 14:00:00', '2025-03-11 17:00:00');  -- 3 hrs, $90/hr


-- =====================================================================
--  13. RESERVATION_SERVICES
-- =====================================================================
INSERT INTO reservation_services (reservation_id, hotel_id, service_name) VALUES
  (1, 1, 'Breakfast'),
  (1, 1, 'Airport Transfer'),
  (2, 2, 'Breakfast'),
  (2, 2, 'Beach Umbrella'),
  (3, 3, 'Breakfast'),
  (3, 3, 'Ski Equipment'),
  (5, 2, 'Breakfast');


-- =====================================================================
--  14. INVOICES
--  Only discount and tax are stored; total is computed by
--  calculate_invoice_total(reservation_id).
-- =====================================================================
INSERT INTO invoices (reservation_id, discount, tax, issue_date) VALUES
  (1, 20.00, 30.00, '2025-01-18'),
  (2, 10.00, 25.00, '2025-02-23'),
  (3,  0.00, 40.00, '2025-03-14'),
  (5, 15.00, 20.00, '2025-05-08');


-- =====================================================================
--  15. PAYMENTS
--  Inserting an approved payment fires T1, which sets
--  reservation_status → 'confirmed' for any 'on_hold' reservation.
-- =====================================================================
INSERT INTO payments (reservation_id, payment_type, date, status) VALUES
  (1, 'credit', '2025-01-18 12:00:00', 'approved'),
  (2, 'cash',   '2025-02-23 15:00:00', 'approved'),
  (3, 'credit', '2025-03-14 10:00:00', 'approved'),
  (5, 'credit', '2025-05-08 09:00:00', 'approved');


-- =====================================================================
--  16. REVIEWS
-- =====================================================================
INSERT INTO reviews (hotel_id, customer_id, rating, date, comment) VALUES
  (1, 1, 5, '2025-01-19', 'Excellent stay, very clean and comfortable rooms.'),
  (2, 2, 4, '2025-02-24', 'Great beach location, staff was very friendly.'),
  (3, 3, 5, '2025-03-15', 'Stunning mountain views, perfect for a ski trip.'),
  (2, 1, 3, '2025-05-09', 'Decent hotel but the breakfast could be better.');


-- =====================================================================
--  VERIFY — quick row counts across all 16 tables
-- =====================================================================
SELECT 'users'                     AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'login',                   COUNT(*) FROM login
UNION ALL SELECT 'admins',                  COUNT(*) FROM admins
UNION ALL SELECT 'hotels',                  COUNT(*) FROM hotels
UNION ALL SELECT 'customers',               COUNT(*) FROM customers
UNION ALL SELECT 'employees',               COUNT(*) FROM employees
UNION ALL SELECT 'overnight_rooms',         COUNT(*) FROM overnight_rooms
UNION ALL SELECT 'meeting_rooms',           COUNT(*) FROM meeting_rooms
UNION ALL SELECT 'services',                COUNT(*) FROM services
UNION ALL SELECT 'reservations',            COUNT(*) FROM reservations
UNION ALL SELECT 'reservation_overnight_rooms', COUNT(*) FROM reservation_overnight_rooms
UNION ALL SELECT 'reservation_meeting_rooms',   COUNT(*) FROM reservation_meeting_rooms
UNION ALL SELECT 'reservation_services',    COUNT(*) FROM reservation_services
UNION ALL SELECT 'invoices',                COUNT(*) FROM invoices
UNION ALL SELECT 'payments',                COUNT(*) FROM payments
UNION ALL SELECT 'reviews',                 COUNT(*) FROM reviews
ORDER BY tbl;
