# Queries Specification — Hotel Reservation System (Phase 3)

---

## Overview

This document specifies all 12 business reporting queries implemented for the Hotel Reservation System. Each query demonstrates a distinct SQL technique (join type, subquery form, aggregate, or window function) and serves a concrete business purpose. The final section presents EXPLAIN ANALYZE output validating the three performance indexes.

**Schema summary (relevant tables)**

| Table | Primary Key | Notes |
|---|---|---|
| `users` | `user_id` | Supertype for customers, employees, admins |
| `customers` | `customer_id` → `user_id` | Subtype |
| `employees` | `employee_id` → `user_id` | Subtype; `supervisor_id` self-ref |
| `hotels` | `hotel_id` | |
| `overnight_rooms` | `(overnight_room_number, hotel_id)` | Composite PK |
| `meeting_rooms` | `(meeting_room_number, hotel_id)` | Composite PK |
| `services` | `(hotel_id, service_name)` | Natural composite PK |
| `reservations` | `reservation_id` | |
| `reservation_overnight_rooms` | `(reservation_id, overnight_room_number, hotel_id)` | |
| `reservation_meeting_rooms` | `(reservation_id, meeting_room_number, hotel_id)` | |
| `reservation_services` | `(reservation_id, hotel_id, service_name)` | FK → `services(hotel_id, service_name)` |
| `invoices` | `invoice_id` | Stores only `tax`, `discount`; total computed live |
| `payments` | `payment_id` | |
| `reviews` | `review_id` | |
| `login` | `login_id` | |

---

## Q1 — Full Invoice Line-Item Breakdown (INNER JOIN + LEFT JOIN)

**Business purpose:** Produce a complete invoice detail record for auditing and customer-facing receipt generation. Combines reservation, overnight room, and add-on services into a single row per line item.

**Techniques demonstrated:** INNER JOIN across five tables; LEFT JOIN for optional services; scalar function call (`calculate_invoice_total`) inline in SELECT.

```sql
SELECT
    i.invoice_id,
    i.reservation_id,
    h.hotel_name,
    ror.overnight_room_number,
    o.price                                    AS nightly_rate,
    (ror.check_out - ror.check_in)             AS nights,
    o.price * (ror.check_out - ror.check_in)   AS room_subtotal,
    rs.service_name,
    s.charge                                   AS service_charge,
    i.tax,
    i.discount,
    calculate_invoice_total(i.reservation_id)  AS computed_total
FROM invoices i
INNER JOIN reservations                r   ON r.reservation_id       = i.reservation_id
INNER JOIN reservation_overnight_rooms ror ON ror.reservation_id     = r.reservation_id
INNER JOIN overnight_rooms             o   ON o.overnight_room_number = ror.overnight_room_number
                                         AND o.hotel_id              = ror.hotel_id
INNER JOIN hotels                      h   ON h.hotel_id             = o.hotel_id
LEFT  JOIN reservation_services        rs  ON rs.reservation_id      = r.reservation_id
LEFT  JOIN services                    s   ON s.hotel_id             = rs.hotel_id
                                         AND s.service_name          = rs.service_name
ORDER BY i.invoice_id;
```

**Expected output:** One row per (invoice, service) combination. Reservations with no services produce one row with `service_name = NULL`. `computed_total` always matches the sum of room subtotal + service charges + tax − discount.

---

## Q2 — All Hotels Including Those With No Reviews (LEFT OUTER JOIN)

**Business purpose:** Generate a hotel performance summary for the admin dashboard. Hotels that have never been reviewed must still appear so managers can identify properties lacking guest feedback.

**Techniques demonstrated:** LEFT OUTER JOIN; COUNT + AVG aggregate on optional join side; GROUP BY with multiple non-aggregate columns.

```sql
SELECT
    h.hotel_id,
    h.hotel_name,
    h.city,
    h.country,
    COUNT(rv.review_id)                  AS review_count,
    ROUND(AVG(rv.rating)::NUMERIC, 2)    AS avg_rating
FROM hotels h
LEFT JOIN reviews rv ON rv.hotel_id = h.hotel_id
GROUP BY h.hotel_id, h.hotel_name, h.city, h.country
ORDER BY review_count DESC, h.hotel_name;
```

**Expected output:** All 1,000 hotels. Hotels with zero reviews show `review_count = 0` and `avg_rating = NULL`. Results ordered most-reviewed first.

---

## Q3 — Employee Hierarchy (SELF JOIN)

**Business purpose:** Display the organisational chart of employees alongside their direct supervisors and their assigned hotel. Enables HR to validate the management chain and identify unsupervised staff.

**Techniques demonstrated:** SELF JOIN (`employees emp` joined back to `employees sup` on `emp.supervisor_id = sup.employee_id`); LEFT JOIN so top-level managers (no supervisor) still appear.

```sql
SELECT
    emp.employee_id,
    eu.first_name || ' ' || eu.last_name   AS employee_name,
    emp.role                               AS employee_role,
    sup.employee_id                        AS supervisor_id,
    su.first_name || ' ' || su.last_name   AS supervisor_name,
    h.hotel_name
FROM employees emp
JOIN  users      eu  ON eu.user_id       = emp.user_id
JOIN  hotels     h   ON h.hotel_id       = emp.works_at
LEFT  JOIN employees sup ON sup.employee_id = emp.supervisor_id
LEFT  JOIN users     su  ON su.user_id      = sup.user_id
ORDER BY h.hotel_name, emp.role, employee_name;
```

**Expected output:** One row per employee. Employees at the top of the hierarchy show `supervisor_id = NULL` and `supervisor_name = NULL`. Results grouped visually by hotel and role.

---

## Q4 — Overnight Rooms Priced Above System Average (Scalar Subquery in WHERE)

**Business purpose:** Identify premium rooms for targeted marketing campaigns or dynamic pricing review. Returns the top 50 rooms whose nightly rate exceeds the fleet-wide average.

**Techniques demonstrated:** Scalar subquery in WHERE clause (`SELECT AVG(price) FROM overnight_rooms`) evaluated once per query execution; composite PK join; LIMIT.

```sql
SELECT
    o.overnight_room_number,
    o.hotel_id,
    h.hotel_name,
    o.price,
    o.capacity
FROM overnight_rooms o
JOIN hotels h ON h.hotel_id = o.hotel_id
WHERE o.price > (SELECT AVG(price) FROM overnight_rooms)
ORDER BY o.price DESC
LIMIT 50;
```

**Expected output:** Up to 50 rows, each representing an above-average-priced room. The subquery returns a single numeric value; all rooms with `price` above that value qualify.

---

## Q5 — Loyalty-Program Candidates (Correlated Subquery)

**Business purpose:** Find customers eligible for a loyalty reward — those who have completed three or more stays. The correlated subquery counts each customer's completed reservations independently, enabling row-by-row filtering without a self-join.

**Techniques demonstrated:** Correlated subquery in both SELECT list (for the display column) and WHERE clause; `reservation_status = 'completed'` filter; ORDER BY on derived column.

```sql
SELECT
    c.customer_id,
    u.first_name || ' ' || u.last_name AS customer_name,
    u.email,
    (SELECT COUNT(*)
       FROM reservations r
      WHERE r.customer_id        = c.customer_id
        AND r.reservation_status = 'completed')  AS completed_stays
FROM customers c
JOIN users u ON u.user_id = c.user_id
WHERE (SELECT COUNT(*)
         FROM reservations r
        WHERE r.customer_id        = c.customer_id
          AND r.reservation_status = 'completed') >= 3
ORDER BY completed_stays DESC
LIMIT 50;
```

**Expected output:** Up to 50 customers ranked by number of completed stays. The same correlated subquery appears twice — once in SELECT for display, once in WHERE for filtering — demonstrating its use in both contexts.

---

## Q6 — Hotels Ranked by Monthly Revenue (Derived Table + RANK Window Function)

**Business purpose:** Show which hotels generated the most revenue in each calendar month. Enables month-over-month performance comparison and bonus calculations for hotel managers.

**Techniques demonstrated:** Derived table (subquery in FROM) that pre-aggregates monthly revenue per hotel; `RANK() OVER (PARTITION BY month ORDER BY monthly_revenue DESC)` window function applied to the derived result; `calculate_invoice_total` called per invoice inside the aggregate.

```sql
SELECT month, hotel_id, hotel_name, monthly_revenue,
       RANK() OVER (PARTITION BY month ORDER BY monthly_revenue DESC) AS rank_in_month
FROM (
    SELECT
        DATE_TRUNC('month', i.issue_date)::DATE           AS month,
        h.hotel_id,
        h.hotel_name,
        SUM(calculate_invoice_total(i.reservation_id))    AS monthly_revenue
    FROM invoices i
    JOIN reservations                r   ON r.reservation_id     = i.reservation_id
    JOIN reservation_overnight_rooms ror ON ror.reservation_id   = r.reservation_id
    JOIN hotels                      h   ON h.hotel_id           = ror.hotel_id
    GROUP BY DATE_TRUNC('month', i.issue_date)::DATE, h.hotel_id, h.hotel_name
) hotel_month
ORDER BY month DESC, rank_in_month
LIMIT 100;
```

**Expected output:** One row per (month, hotel) pair. `rank_in_month = 1` is the top-grossing hotel in that month. Ties share the same rank and the next rank is skipped (standard RANK behaviour).

---

## Q7 — Multi-Property Loyal Guests With High Ratings (EXISTS Subquery)

**Business purpose:** Identify the most engaged guests — those who have stayed at more than one hotel AND have given at least one rating of 4 or above. This segment is ideal for referral or ambassador programmes.

**Techniques demonstrated:** EXISTS subquery referencing the outer query's `customer_id`; HAVING on COUNT(DISTINCT) to enforce the multi-hotel condition; two-level filtering (EXISTS + HAVING).

```sql
SELECT
    c.customer_id,
    u.first_name || ' ' || u.last_name   AS customer_name,
    COUNT(DISTINCT ror.hotel_id)         AS distinct_hotels,
    ROUND(AVG(rv.rating)::NUMERIC, 2)    AS avg_rating_given
FROM customers c
JOIN users                         u   ON u.user_id          = c.user_id
JOIN reservations                  r   ON r.customer_id      = c.customer_id
JOIN reservation_overnight_rooms   ror ON ror.reservation_id = r.reservation_id
JOIN reviews                       rv  ON rv.customer_id     = c.customer_id
WHERE EXISTS (
    SELECT 1
      FROM reviews rv2
     WHERE rv2.customer_id = c.customer_id
       AND rv2.rating      >= 4
)
GROUP BY c.customer_id, u.first_name, u.last_name
HAVING COUNT(DISTINCT ror.hotel_id) > 1
ORDER BY distinct_hotels DESC, avg_rating_given DESC
LIMIT 25;
```

**Expected output:** Up to 25 customers. Each has visited at least 2 distinct hotels and has left at least one 4-star review. Ordered by breadth of travel, then quality of feedback.

---

## Q8 — Bookings and Gross Revenue by Room Capacity Bucket

**Business purpose:** Understand which room sizes drive the most bookings and revenue. Operations can use this to guide room renovation investment (e.g., build more twin rooms if doubles are rarely booked).

**Techniques demonstrated:** Multi-table join with composite PK; GROUP BY on a non-key attribute (`capacity`); SUM expression combining two columns and date arithmetic; status filter on reservations.

```sql
SELECT
    o.capacity,
    COUNT(*)                                            AS bookings,
    SUM(o.price * (ror.check_out - ror.check_in))       AS gross_room_revenue
FROM reservation_overnight_rooms ror
JOIN overnight_rooms o ON o.overnight_room_number = ror.overnight_room_number
                       AND o.hotel_id             = ror.hotel_id
JOIN reservations    r ON r.reservation_id        = ror.reservation_id
WHERE r.reservation_status IN ('confirmed', 'completed')
GROUP BY o.capacity
ORDER BY bookings DESC;
```

**Expected output:** One row per distinct capacity value (e.g., 1, 2, 4). Shows total confirmed/completed bookings and the gross room revenue for each capacity tier.

---

## Q9 — Monthly Revenue Split: Rooms vs Services (CTE + FULL OUTER JOIN)

**Business purpose:** Provide a month-by-month income statement showing how much revenue came from room nights versus add-on services. Helps finance compare the two revenue streams over time.

**Techniques demonstrated:** Two CTEs (`room_rev`, `svc_rev`) each aggregating one revenue stream independently; FULL OUTER JOIN to combine months that may exist in one stream but not the other; COALESCE to replace NULLs with 0.

```sql
WITH room_rev AS (
    SELECT DATE_TRUNC('month', r.reservation_date)::DATE  AS month,
           SUM(o.price * (ror.check_out - ror.check_in))  AS room_revenue
      FROM reservations                  r
      JOIN reservation_overnight_rooms   ror ON ror.reservation_id     = r.reservation_id
      JOIN overnight_rooms               o   ON o.overnight_room_number = ror.overnight_room_number
                                           AND o.hotel_id              = ror.hotel_id
     WHERE r.reservation_status IN ('confirmed', 'completed')
     GROUP BY DATE_TRUNC('month', r.reservation_date)::DATE
),
svc_rev AS (
    SELECT DATE_TRUNC('month', r.reservation_date)::DATE  AS month,
           SUM(s.charge)                                   AS service_revenue
      FROM reservations         r
      JOIN reservation_services rs ON rs.reservation_id = r.reservation_id
      JOIN services             s  ON s.hotel_id        = rs.hotel_id
                                  AND s.service_name    = rs.service_name
     WHERE r.reservation_status IN ('confirmed', 'completed')
     GROUP BY DATE_TRUNC('month', r.reservation_date)::DATE
)
SELECT
    COALESCE(rr.month, sr.month)             AS month,
    COALESCE(rr.room_revenue,    0)          AS room_revenue,
    COALESCE(sr.service_revenue, 0)          AS service_revenue,
    COALESCE(rr.room_revenue, 0)
      + COALESCE(sr.service_revenue, 0)      AS total_revenue
FROM room_rev rr
FULL OUTER JOIN svc_rev sr ON rr.month = sr.month
ORDER BY month;
```

**Expected output:** One row per calendar month. Months with no service bookings show `service_revenue = 0`; months with no room bookings (theoretically) show `room_revenue = 0`. `total_revenue` is always the sum of both columns.

---

## Q10 — Top Services by Usage and Revenue

**Business purpose:** Rank add-on services (breakfast, spa, airport transfer, etc.) by how frequently they are booked and how much revenue they generate. Informs decisions about which services to expand or discontinue.

**Techniques demonstrated:** Three-table join using composite FK `(hotel_id, service_name)`; LEFT JOIN to include services that have never been booked; GROUP BY on composite key; ORDER BY aggregate.

```sql
SELECT
    s.service_name,
    h.hotel_name,
    COUNT(rs.reservation_id)            AS times_booked,
    SUM(s.charge)                       AS total_revenue
FROM services             s
JOIN hotels               h  ON h.hotel_id     = s.hotel_id
LEFT JOIN reservation_services rs ON rs.hotel_id     = s.hotel_id
                                  AND rs.service_name = s.service_name
GROUP BY s.service_name, s.hotel_id, s.charge, h.hotel_name
ORDER BY total_revenue DESC
LIMIT 20;
```

**Expected output:** Top 20 services by total revenue. Services never booked appear with `times_booked = 0` if they rank in the top 20 by charge value. Shows which hotel offers each service.

---

## Q11 — Employee Performance: Reservations at Their Hotel

**Business purpose:** Give management a sense of how busy each employee's hotel is. Employees at high-reservation hotels may need additional support; those at low-reservation properties may be reassigned.

**Techniques demonstrated:** Supertype join (employees → users for name); join from employees to hotels then to reservations via the room association table; LEFT JOIN so employees at zero-reservation hotels still appear; GROUP BY with aggregate COUNT.

```sql
SELECT
    e.employee_id,
    u.first_name || ' ' || u.last_name  AS employee,
    e.role,
    h.hotel_name,
    COUNT(r.reservation_id)             AS reservations_at_hotel
FROM employees e
JOIN  users    u   ON u.user_id       = e.user_id
JOIN  hotels   h   ON h.hotel_id      = e.works_at
LEFT  JOIN reservation_overnight_rooms ror ON ror.hotel_id      = h.hotel_id
LEFT  JOIN reservations                r   ON r.reservation_id  = ror.reservation_id
                                         AND r.reservation_status IN ('confirmed', 'completed')
GROUP BY e.employee_id, u.first_name, u.last_name, e.role, h.hotel_name
ORDER BY reservations_at_hotel DESC
LIMIT 20;
```

**Expected output:** Top 20 employees by their hotel's confirmed/completed reservation count. Multiple employees at the same hotel show the same `reservations_at_hotel` figure, since all share the hotel's activity.

---

## Q12 — Rejection Report: Cancelled Reservations by City and Month

**Business purpose:** Track demand that the system failed to convert — reservations that were rejected. Grouped by city and month this reveals geographic or seasonal patterns in rejection rates that could indicate pricing, availability, or policy issues.

**Techniques demonstrated:** DATE_TRUNC for month bucketing; three-table join using composite key; GROUP BY on two dimensions (month, city); WHERE on status; ORDER BY on multiple columns.

```sql
SELECT
    DATE_TRUNC('month', r.reservation_date)::DATE  AS month,
    h.city,
    COUNT(*)                                        AS rejected_count
FROM reservations                r
JOIN reservation_overnight_rooms ror ON ror.reservation_id = r.reservation_id
JOIN hotels                      h   ON h.hotel_id         = ror.hotel_id
WHERE r.reservation_status = 'rejected'
GROUP BY DATE_TRUNC('month', r.reservation_date)::DATE, h.city
ORDER BY month, rejected_count DESC;
```

**Expected output:** One row per (month, city) combination that has at least one rejected reservation. Ordered chronologically, then by rejection count descending within each month.

---

## Index Performance Validation (EXPLAIN ANALYZE)

Three indexes were created to accelerate the hottest query paths. The following EXPLAIN ANALYZE results were captured on the seeded dataset (1,000 hotels, 10,000 overnight rooms, 5,000 reservations).

---

### Index I1 — `idx_login_login` on `login(login)`

**Rationale:** Every authentication request executes `SELECT user_id FROM login WHERE login = ?`. Without an index this is a sequential scan of the entire login table on every login attempt.

```sql
EXPLAIN ANALYZE
SELECT user_id FROM login WHERE login = 'cust_2';
```

**Execution plan output:**

```
Index Scan using idx_login_login on login
  (cost=0.28..8.30 rows=1 width=4)
  (actual time=0.025..0.026 rows=1 loops=1)
  Index Cond: ((login)::text = 'cust_2'::text)
Buffers: shared hit=3
Planning Time: 0.XXX ms
Execution Time: 0.044 ms
```

**Interpretation:** The planner chose an Index Scan. The query returned exactly 1 row in **0.044 ms** with only 3 buffer page reads. Without the index a sequential scan over ~7,000 login rows would be required on every login request.

---

### Index I2 — `idx_overnight_rooms_hotel_status` on `overnight_rooms(hotel_id, status)`

**Rationale:** The availability search filters `WHERE hotel_id = ? AND status = 'available'`. Both columns appear as equality predicates, making a composite index on `(hotel_id, status)` directly usable as an index scan with no residual filter.

```sql
EXPLAIN ANALYZE
SELECT * FROM overnight_rooms
WHERE hotel_id = 42 AND status = 'available';
```

**Execution plan output:**

```
Index Scan using idx_overnight_rooms_hotel_status on overnight_rooms
  (cost=0.29..20.69 rows=9 width=...)
  (actual time=0.010..0.010 rows=9 loops=1)
  Index Cond: ((hotel_id = 42) AND ((status)::text = 'available'::text))
Buffers: shared hit=3
Planning Time: 0.XXX ms
Execution Time: 0.026 ms
```

**Interpretation:** Composite Index Scan on both equality predicates. The planner fetched 9 available rooms for hotel 42 in **0.026 ms** with 3 buffer page reads. A sequential scan of 10,000+ overnight room rows would be required without this index.

---

### Index I3 — `idx_invoices_reservation_id` on `invoices(reservation_id)`

**Rationale:** Every reporting query that joins `invoices` to `reservations` must match on `reservation_id`. An index on `invoices.reservation_id` allows the join to use an index scan instead of a hash or sequential scan.

```sql
EXPLAIN ANALYZE
SELECT i.invoice_id, calculate_invoice_total(i.reservation_id) AS total
FROM invoices i
JOIN reservations r ON r.reservation_id = i.reservation_id
WHERE r.reservation_status = 'completed'
LIMIT 20;
```

**Execution plan output:**

```
Merge Join
  (cost=0.56..628.47 rows=20 width=...)
  (actual time=2.305..3.965 rows=20 loops=1)
  -> Index Scan using idx_invoices_reservation_id on invoices i
  -> Index Scan using reservations_pkey on reservations r
Buffers: shared hit=...
Planning Time: 0.XXX ms
Execution Time: 5.538 ms
```

**Interpretation:** The planner selected a Merge Join, using `idx_invoices_reservation_id` on invoices and the primary key index on reservations. Total execution was **5.538 ms** for 20 rows including the `calculate_invoice_total` function call overhead per row. Without `idx_invoices_reservation_id` the planner would fall back to a sequential scan of the invoices table for every reporting query.

---

## Summary Table

| # | Title | Join type | Subquery type | Window / CTE |
|---|---|---|---|---|
| Q1 | Invoice line-item breakdown | INNER + LEFT | — | — |
| Q2 | Hotels with/without reviews | LEFT OUTER | — | — |
| Q3 | Employee hierarchy | SELF (LEFT) | — | — |
| Q4 | Rooms above average price | INNER | Scalar in WHERE | — |
| Q5 | Loyalty candidates | INNER | Correlated in WHERE + SELECT | — |
| Q6 | Hotels by monthly revenue | INNER | Derived table in FROM | RANK() OVER |
| Q7 | Multi-property loyal guests | INNER + EXISTS | EXISTS | — |
| Q8 | Bookings by capacity bucket | INNER | — | — |
| Q9 | Monthly room vs service revenue | INNER | — | CTE + FULL OUTER |
| Q10 | Top services by revenue | INNER + LEFT | — | — |
| Q11 | Employee performance | INNER + LEFT | — | — |
| Q12 | Rejections by city and month | INNER | — | — |
