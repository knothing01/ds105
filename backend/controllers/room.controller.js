const db = require('../db/connection');

// GET /api/rooms/overnight?hotel_id=X&city=Y&status=available
exports.getOvernightRooms = async (req, res, next) => {
  try {
    const { hotel_id, city, status } = req.query;
    const where = []; const params = [];
    if (hotel_id) { params.push(hotel_id);      where.push(`o.hotel_id = $${params.length}`); }
    if (city)     { params.push(`%${city}%`);   where.push(`h.city ILIKE $${params.length}`); }
    if (status)   { params.push(status);         where.push(`o.status = $${params.length}`); }

    const { rows } = await db.query(
      `SELECT o.overnight_room_number AS room_number, o.hotel_id, o.price,
              o.capacity, o.status, h.hotel_name, h.city, h.country
         FROM overnight_rooms o
         JOIN hotels h ON h.hotel_id = o.hotel_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY o.hotel_id, o.overnight_room_number LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
};

// GET /api/rooms/meeting?hotel_id=X
exports.getMeetingRooms = async (req, res, next) => {
  try {
    const { hotel_id } = req.query;
    const params = []; let where = '';
    if (hotel_id) { params.push(hotel_id); where = 'WHERE m.hotel_id = $1'; }

    const { rows } = await db.query(
      `SELECT m.meeting_room_number AS room_number, m.hotel_id, m.hourly_rate,
              m.capacity, m.status, m.equipment, h.hotel_name, h.city
         FROM meeting_rooms m
         JOIN hotels h ON h.hotel_id = m.hotel_id
        ${where}
        ORDER BY m.hotel_id, m.meeting_room_number LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
};

// GET /api/rooms/available?hotel_id=X&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&city=Y
exports.getAvailable = async (req, res, next) => {
  try {
    const { hotel_id, check_in, check_out, city } = req.query;
    if (!check_in || !check_out)
      return res.status(400).json({ error: 'check_in and check_out are required' });

    const params = [check_in, check_out];
    const extra  = [];
    if (hotel_id) { params.push(hotel_id);    extra.push(`o.hotel_id = $${params.length}`); }
    if (city)     { params.push(`%${city}%`); extra.push(`h.city ILIKE $${params.length}`); }

    const { rows } = await db.query(
      `SELECT o.overnight_room_number AS room_number, o.hotel_id, o.price,
              o.capacity, o.status, h.hotel_name, h.city, h.country
         FROM overnight_rooms o
         JOIN hotels h ON h.hotel_id = o.hotel_id
        WHERE o.status = 'available'
          ${extra.length ? 'AND ' + extra.join(' AND ') : ''}
          AND NOT EXISTS (
              SELECT 1
                FROM reservation_overnight_rooms ror
                JOIN reservations r ON r.reservation_id = ror.reservation_id
               WHERE ror.overnight_room_number = o.overnight_room_number
                 AND ror.hotel_id              = o.hotel_id
                 AND r.reservation_status IN ('on_hold','confirmed')
                 AND NOT (ror.check_out <= $1 OR ror.check_in >= $2)
          )
        ORDER BY o.price LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
};

// GET /api/rooms/overnight/:hotel_id/:room_number
exports.getOvernightById = async (req, res, next) => {
  try {
    const { hotel_id, room_number } = req.params;
    const { rows } = await db.query(
      `SELECT o.*, h.hotel_name, h.city, h.country, h.address
         FROM overnight_rooms o
         JOIN hotels h ON h.hotel_id = o.hotel_id
        WHERE o.hotel_id = $1 AND o.overnight_room_number = $2`,
      [hotel_id, room_number]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// GET /api/rooms/meeting/:hotel_id/:room_number
exports.getMeetingById = async (req, res, next) => {
  try {
    const { hotel_id, room_number } = req.params;
    const { rows } = await db.query(
      `SELECT m.*, h.hotel_name, h.city, h.country
         FROM meeting_rooms m
         JOIN hotels h ON h.hotel_id = m.hotel_id
        WHERE m.hotel_id = $1 AND m.meeting_room_number = $2`,
      [hotel_id, room_number]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// GET /api/rooms/meeting/available?hotel_id=X&start_time=Y&end_time=Z&city=Z
exports.getAvailableMeeting = async (req, res, next) => {
  try {
    const { hotel_id, start_time, end_time, city } = req.query;
    if (!start_time || !end_time)
      return res.status(400).json({ error: 'start_time and end_time are required' });

    const params = [start_time, end_time];
    const extra  = [];
    if (hotel_id) { params.push(hotel_id);    extra.push(`m.hotel_id = $${params.length}`); }
    if (city)     { params.push(`%${city}%`); extra.push(`h.city ILIKE $${params.length}`); }

    const { rows } = await db.query(
      `SELECT m.meeting_room_number AS room_number, m.hotel_id, m.hourly_rate,
              m.capacity, m.status, m.equipment, h.hotel_name, h.city, h.country
         FROM meeting_rooms m
         JOIN hotels h ON h.hotel_id = m.hotel_id
        WHERE m.status = 'available'
          ${extra.length ? 'AND ' + extra.join(' AND ') : ''}
          AND NOT EXISTS (
              SELECT 1
                FROM reservation_meeting_rooms rmr
                JOIN reservations r ON r.reservation_id = rmr.reservation_id
               WHERE rmr.meeting_room_number = m.meeting_room_number
                 AND rmr.hotel_id            = m.hotel_id
                 AND r.reservation_status IN ('on_hold','confirmed')
                 AND NOT (rmr.end_time <= $1 OR rmr.start_time >= $2)
          )
        ORDER BY m.hourly_rate LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
};

exports.createOvernight = async (req, res, next) => {
  try {
    const { overnight_room_number, hotel_id, price, capacity, status } = req.body;
    const { rows } = await db.query(
      `INSERT INTO overnight_rooms(overnight_room_number,hotel_id,price,capacity,status)
       VALUES($1,$2,$3,$4,COALESCE($5,'available')) RETURNING *`,
      [overnight_room_number, hotel_id, price, capacity, status]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.createMeeting = async (req, res, next) => {
  try {
    const { meeting_room_number, hotel_id, hourly_rate, capacity, status, equipment } = req.body;
    const { rows } = await db.query(
      `INSERT INTO meeting_rooms(meeting_room_number,hotel_id,hourly_rate,capacity,status,equipment)
       VALUES($1,$2,$3,$4,COALESCE($5,'available'),$6) RETURNING *`,
      [meeting_room_number, hotel_id, hourly_rate, capacity, status, equipment || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.updateOvernight = async (req, res, next) => {
  try {
    const { price, capacity, status } = req.body;
    const { rows } = await db.query(
      `UPDATE overnight_rooms SET price=$1,capacity=$2,status=$3
        WHERE hotel_id=$4 AND overnight_room_number=$5 RETURNING *`,
      [price, capacity, status, req.params.hotel_id, req.params.room_number]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.updateMeeting = async (req, res, next) => {
  try {
    const { hourly_rate, capacity, status, equipment } = req.body;
    const { rows } = await db.query(
      `UPDATE meeting_rooms SET hourly_rate=$1,capacity=$2,status=$3,equipment=$4
        WHERE hotel_id=$5 AND meeting_room_number=$6 RETURNING *`,
      [hourly_rate, capacity, status, equipment, req.params.hotel_id, req.params.room_number]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};
