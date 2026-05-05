const db = require('../db/connection');

exports.getAll = async (req, res, next) => {
  try {
    const { customer_id, status } = req.query;
    const where = []; const params = [];
    if (customer_id) { params.push(customer_id); where.push(`r.customer_id = $${params.length}`); }
    if (status)      { params.push(status);       where.push(`r.reservation_status = $${params.length}`); }

    const { rows } = await db.query(
      `SELECT r.*,
              u.first_name || ' ' || u.last_name AS customer_name,
              u.email AS customer_email,
              room.hotel_name,
              room.check_in,
              room.check_out
         FROM reservations r
         JOIN customers c ON c.customer_id = r.customer_id
         JOIN users u     ON u.user_id     = c.user_id
         LEFT JOIN LATERAL (
           SELECT h.hotel_name, ror.check_in, ror.check_out
             FROM reservation_overnight_rooms ror
             JOIN hotels h ON h.hotel_id = ror.hotel_id
            WHERE ror.reservation_id = r.reservation_id
            LIMIT 1
         ) room ON true
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY r.reservation_date DESC LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*,
              u.first_name || ' ' || u.last_name AS customer_name,
              u.email AS customer_email
         FROM reservations r
         JOIN customers c ON c.customer_id = r.customer_id
         JOIN users u     ON u.user_id     = c.user_id
        WHERE r.reservation_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const overnight = (await db.query(
      `SELECT ror.*, o.price, o.capacity, h.hotel_name, h.city
         FROM reservation_overnight_rooms ror
         JOIN overnight_rooms o ON o.overnight_room_number = ror.overnight_room_number AND o.hotel_id = ror.hotel_id
         JOIN hotels h          ON h.hotel_id = ror.hotel_id
        WHERE ror.reservation_id = $1`, [req.params.id]
    )).rows;

    const meeting = (await db.query(
      `SELECT rmr.*, m.hourly_rate, m.capacity, h.hotel_name, h.city
         FROM reservation_meeting_rooms rmr
         JOIN meeting_rooms m ON m.meeting_room_number = rmr.meeting_room_number AND m.hotel_id = rmr.hotel_id
         JOIN hotels h        ON h.hotel_id = rmr.hotel_id
        WHERE rmr.reservation_id = $1`, [req.params.id]
    )).rows;

    const services = (await db.query(
      `SELECT s.* FROM reservation_services rs
         JOIN services s ON s.hotel_id = rs.hotel_id AND s.service_name = rs.service_name
        WHERE rs.reservation_id = $1`, [req.params.id]
    )).rows;

    res.json({ ...rows[0], overnight_rooms: overnight, meeting_rooms: meeting, services });
  } catch (e) { next(e); }
};

// POST /api/reservations
// overnight: { type:'overnight', hotel_id, room_number, check_in, check_out, service_ids:[] }
// meeting:   { type:'meeting',   hotel_id, room_number, start_time, end_time, service_ids:[] }
exports.create = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { type = 'overnight', hotel_id, room_number,
            check_in, check_out, start_time, end_time,
            services = [] } = req.body;
    // services: array of { hotel_id, service_name }

    const { rows: cRows } = await client.query(
      'SELECT customer_id FROM customers WHERE user_id = $1', [req.user.user_id]
    );
    if (!cRows.length) return res.status(403).json({ error: 'Only customers can make reservations' });
    const customer_id = cRows[0].customer_id;

    await client.query('BEGIN');

    const { rows: resRows } = await client.query(
      `INSERT INTO reservations(customer_id, reservation_date, reservation_status)
       VALUES($1, NOW(), 'on_hold') RETURNING reservation_id`,
      [customer_id]
    );
    const reservation_id = resRows[0].reservation_id;

    if (type === 'overnight') {
      if (!check_in || !check_out) throw new Error('check_in and check_out required');

      const conflict = await client.query(
        `SELECT 1 FROM reservation_overnight_rooms ror
          JOIN reservations r ON r.reservation_id = ror.reservation_id
         WHERE ror.overnight_room_number = $1 AND ror.hotel_id = $2
           AND r.reservation_status IN ('on_hold','confirmed')
           AND NOT (ror.check_out <= $3 OR ror.check_in >= $4)`,
        [room_number, hotel_id, check_in, check_out]
      );
      if (conflict.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Room already booked for those dates' });
      }

      await client.query(
        `INSERT INTO reservation_overnight_rooms(reservation_id,overnight_room_number,hotel_id,check_in,check_out)
         VALUES($1,$2,$3,$4,$5)`,
        [reservation_id, room_number, hotel_id, check_in, check_out]
      );
    } else {
      if (!start_time || !end_time) throw new Error('start_time and end_time required');
      await client.query(
        `INSERT INTO reservation_meeting_rooms(reservation_id,meeting_room_number,hotel_id,start_time,end_time)
         VALUES($1,$2,$3,$4,$5)`,
        [reservation_id, room_number, hotel_id, start_time, end_time]
      );
    }

    for (const svc of services) {
      await client.query(
        'INSERT INTO reservation_services(reservation_id,hotel_id,service_name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [reservation_id, svc.hotel_id, svc.service_name]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ reservation_id, customer_id, status: 'on_hold' });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['on_hold','confirmed','rejected','completed'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await db.query(
      `UPDATE reservations SET reservation_status=$1 WHERE reservation_id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM reservations WHERE reservation_id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
};
