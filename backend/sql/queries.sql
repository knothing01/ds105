-- =====================================================================
--  BUSINESS REPORTING QUERIES — Phase 3 schema
--  Hotel Reservation System
--
--  Demonstrates:
--    • INNER, LEFT OUTER, SELF, FULL OUTER joins
--    • Scalar / correlated / derived-table / EXISTS subqueries
--    • CTEs, window functions (RANK, ROW_NUMBER)
--    • Aggregate analytics aligned with Phase 3 business logic
--    • EXPLAIN ANALYZE for the three defined indexes
-- =====================================================================


-- ---------------------------------------------------------------------
-- Q1. INNER JOIN — Full invoice line-item breakdown
--     Combines reservation + room + services for each invoice.
-- ---------------------------------------------------------------------
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
INNER JOIN hotels                      h   ON h.hotel_id              = o.hotel_id
LEFT  JOIN reservation_services        rs  ON rs.reservation_id       = r.reservation_id
LEFT  JOIN services                    s   ON s.hotel_id              = rs.hotel_id
                                          AND s.service_name          = rs.service_name
ORDER BY i.invoice_id;


-- ---------------------------------------------------------------------
-- Q2. LEFT OUTER JOIN — All hotels including those with no reviews
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q3. SELF JOIN — Employees with their direct supervisor
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q4. SCALAR SUBQUERY IN WHERE — Overnight rooms priced above system avg
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q5. CORRELATED SUBQUERY — Loyalty-program candidates
--     Customers with 3+ completed stays
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q6. DERIVED TABLE (subquery in FROM) — Hotels ranked by monthly revenue
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q7. EXISTS — Multi-property loyal customers with high-rating reviews
--     Guests who stayed at more than one hotel AND left a rating >= 4
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q8. Bookings and revenue by room capacity bucket
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q9. Monthly revenue split: room income vs service income (CTE + FULL OUTER JOIN)
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q10. Top services by usage and revenue
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q11. Employee performance — reservations handled at their hotel
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- Q12. Rejection report — cancelled reservations by city and month
-- ---------------------------------------------------------------------
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


-- =====================================================================
--  EXPLAIN ANALYZE — performance validation for the three indexes
-- =====================================================================

-- I1: idx_login_login — authentication lookup
EXPLAIN ANALYZE
SELECT user_id FROM login WHERE login = 'cust_2';

-- I2: idx_overnight_rooms_hotel_status — availability search
EXPLAIN ANALYZE
SELECT * FROM overnight_rooms
WHERE hotel_id = 42 AND status = 'available';

-- I3: idx_invoices_reservation_id — invoice join
EXPLAIN ANALYZE
SELECT i.invoice_id, calculate_invoice_total(i.reservation_id) AS total
FROM invoices i
JOIN reservations r ON r.reservation_id = i.reservation_id
WHERE r.reservation_status = 'completed'
LIMIT 20;
