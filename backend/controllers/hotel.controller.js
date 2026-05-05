const db = require('../db/connection');

exports.getAll = async (req, res, next) => {
  try {
    const { city, country, min_rating } = req.query;
    const where = []; const params = [];
    if (city)       { params.push(`%${city}%`);    where.push(`h.city    ILIKE $${params.length}`); }
    if (country)    { params.push(`%${country}%`); where.push(`h.country ILIKE $${params.length}`); }

    const sql = `
      SELECT h.*,
             COALESCE(ROUND(AVG(rv.rating), 2), 0)          AS avg_rating,
             COUNT(DISTINCT rv.review_id)                    AS review_count,
             COALESCE(MIN(or2.price), 0)                     AS min_price,
             COUNT(DISTINCT or2.overnight_room_number)        AS room_count
        FROM hotels h
        LEFT JOIN reviews        rv  ON rv.hotel_id  = h.hotel_id
        LEFT JOIN overnight_rooms or2 ON or2.hotel_id = h.hotel_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       GROUP BY h.hotel_id
       ${min_rating ? `HAVING COALESCE(ROUND(AVG(rv.rating),2),0) >= ${parseFloat(min_rating)}` : ''}
       ORDER BY avg_rating DESC NULLS LAST
       LIMIT 100`;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT h.*,
              COALESCE(ROUND(AVG(rv.rating), 2), 0) AS avg_rating,
              COUNT(rv.review_id)                    AS review_count
         FROM hotels h
         LEFT JOIN reviews rv ON rv.hotel_id = h.hotel_id
        WHERE h.hotel_id = $1
        GROUP BY h.hotel_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const services = (await db.query('SELECT * FROM services WHERE hotel_id=$1', [req.params.id])).rows;
    res.json({ ...rows[0], services });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { hotel_name, city, country, address, phone, email, added_by } = req.body;
    const { rows } = await db.query(
      `INSERT INTO hotels(hotel_name,city,country,address,phone,email,added_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [hotel_name, city, country, address, phone || null, email || null, added_by || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { hotel_name, city, country, address, phone, email } = req.body;
    const { rows } = await db.query(
      `UPDATE hotels SET hotel_name=$1,city=$2,country=$3,address=$4,phone=$5,email=$6
        WHERE hotel_id=$7 RETURNING *`,
      [hotel_name, city, country, address, phone, email, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM hotels WHERE hotel_id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
};
