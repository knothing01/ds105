const db = require('../db/connection');

exports.overviewStats = async (_, res, next) => {
  try {
    const [hotels, reservations, customers, revenue] = await Promise.all([
      db.query('SELECT COUNT(*) FROM hotels'),
      db.query('SELECT COUNT(*) FROM reservations'),
      db.query('SELECT COUNT(*) FROM customers'),
      db.query(`
        SELECT COALESCE(
          (SELECT SUM(o.price * (ror.check_out - ror.check_in))
             FROM reservation_overnight_rooms ror
             JOIN overnight_rooms o ON o.overnight_room_number = ror.overnight_room_number
                                   AND o.hotel_id = ror.hotel_id
             JOIN payments p ON p.reservation_id = ror.reservation_id
            WHERE p.status = 'approved')
          , 0) +
          COALESCE(
          (SELECT SUM(m.hourly_rate *
                      CEIL(EXTRACT(EPOCH FROM (rmr.end_time - rmr.start_time)) / 3600.0))
             FROM reservation_meeting_rooms rmr
             JOIN meeting_rooms m ON m.meeting_room_number = rmr.meeting_room_number
                                  AND m.hotel_id = rmr.hotel_id
             JOIN payments p ON p.reservation_id = rmr.reservation_id
            WHERE p.status = 'approved')
          , 0) AS total_revenue`),
    ]);
    res.json({
      hotels:       Number(hotels.rows[0].count),
      reservations: Number(reservations.rows[0].count),
      customers:    Number(customers.rows[0].count),
      total_revenue: Number(revenue.rows[0].total_revenue),
    });
  } catch (e) { next(e); }
};

exports.monthlyRevenue = async (_, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT DATE_TRUNC('month', p.date)::date AS month,
             COUNT(*)                          AS payments,
             SUM(calculate_invoice_total(p.reservation_id)) AS total_revenue
        FROM payments p
        WHERE p.status = 'approved'
        GROUP BY DATE_TRUNC('month', p.date)
        ORDER BY month`);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.topHotels = async (_, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT h.hotel_id, h.hotel_name, h.city,
             ROUND(AVG(rv.rating), 2) AS avg_rating,
             COUNT(rv.review_id)      AS review_count
        FROM hotels h
        JOIN reviews rv ON rv.hotel_id = h.hotel_id
       GROUP BY h.hotel_id
       HAVING COUNT(rv.review_id) >= 2
       ORDER BY avg_rating DESC, review_count DESC LIMIT 10`);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.mostReservedRooms = async (_, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT room_type, room_number, hotel_id, hotel_name, reservations, revenue
        FROM (
          SELECT 'overnight' AS room_type,
                 ror.overnight_room_number AS room_number,
                 ror.hotel_id,
                 h.hotel_name,
                 COUNT(*) AS reservations,
                 SUM(o.price * (ror.check_out - ror.check_in)) AS revenue
            FROM reservation_overnight_rooms ror
            JOIN overnight_rooms o ON o.overnight_room_number = ror.overnight_room_number
                                   AND o.hotel_id = ror.hotel_id
            JOIN hotels h ON h.hotel_id = ror.hotel_id
            JOIN reservations r ON r.reservation_id = ror.reservation_id
           WHERE r.reservation_status IN ('confirmed','completed')
           GROUP BY ror.overnight_room_number, ror.hotel_id, h.hotel_name
          UNION ALL
          SELECT 'meeting' AS room_type,
                 rmr.meeting_room_number AS room_number,
                 rmr.hotel_id,
                 h.hotel_name,
                 COUNT(*) AS reservations,
                 SUM(m.hourly_rate * CEIL(EXTRACT(EPOCH FROM (rmr.end_time - rmr.start_time)) / 3600.0)) AS revenue
            FROM reservation_meeting_rooms rmr
            JOIN meeting_rooms m ON m.meeting_room_number = rmr.meeting_room_number
                                 AND m.hotel_id = rmr.hotel_id
            JOIN hotels h ON h.hotel_id = rmr.hotel_id
            JOIN reservations r ON r.reservation_id = rmr.reservation_id
           WHERE r.reservation_status IN ('confirmed','completed')
           GROUP BY rmr.meeting_room_number, rmr.hotel_id, h.hotel_name
        ) combined
       ORDER BY reservations DESC LIMIT 10`);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.customerActivity = async (_, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT c.customer_id,
             u.first_name || ' ' || u.last_name AS name,
             u.email,
             COUNT(r.reservation_id) AS total_reservations,
             COUNT(r.reservation_id) FILTER (WHERE r.reservation_status = 'completed') AS completed_stays,
             COALESCE(SUM(calculate_invoice_total(i.reservation_id)), 0) AS total_spent
        FROM customers c
        JOIN users u ON u.user_id = c.user_id
        LEFT JOIN reservations r ON r.customer_id = c.customer_id
        LEFT JOIN invoices i     ON i.reservation_id = r.reservation_id
       GROUP BY c.customer_id, u.first_name, u.last_name, u.email
       ORDER BY total_reservations DESC LIMIT 20`);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.serviceRevenue = async (_, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT s.hotel_id, s.service_name, h.hotel_name,
             COUNT(rs.reservation_id) AS times_used,
             COALESCE(COUNT(rs.reservation_id) * s.charge, 0) AS total_revenue
        FROM services s
        LEFT JOIN reservation_services rs
               ON rs.hotel_id = s.hotel_id AND rs.service_name = s.service_name
        JOIN hotels h ON h.hotel_id = s.hotel_id
       GROUP BY s.hotel_id, s.service_name, s.charge, h.hotel_name
       ORDER BY total_revenue DESC LIMIT 25`);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.employeePerformance = async (_, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT e.employee_id,
             u.first_name || ' ' || u.last_name AS name,
             e.role, h.hotel_name,
             mgr.first_name || ' ' || mgr.last_name AS supervisor_name
        FROM employees e
        JOIN users u   ON u.user_id  = e.user_id
        JOIN hotels h  ON h.hotel_id = e.works_at
        LEFT JOIN employees se  ON se.employee_id = e.supervisor_id
        LEFT JOIN users    mgr ON mgr.user_id      = se.user_id
       ORDER BY e.works_at, e.role LIMIT 50`);
    res.json(rows);
  } catch (e) { next(e); }
};
