// controllers/review.controller.js
const db = require('../db/connection');

exports.getAll = async (req, res, next) => {
  try {
    const { hotel_id, customer_id } = req.query;
    const params = []; const where = [];
    if (hotel_id)    { params.push(hotel_id);    where.push(`r.hotel_id = $${params.length}`); }
    if (customer_id) { params.push(customer_id); where.push(`r.customer_id = $${params.length}`); }
    const { rows } = await db.query(`
      SELECT r.*, c.first_name||' '||c.last_name AS customer_name
        FROM reviews r
        JOIN customers c ON c.customer_id = r.customer_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY r.review_date DESC LIMIT 100`, params);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { hotel_id, rating, comment } = req.body;

    const { rows: cRows } = await db.query(
      'SELECT customer_id FROM customers WHERE user_id = $1', [req.user.user_id]);
    if (!cRows.length)
      return res.status(403).json({ error: 'Only customers can write reviews' });
    const customer_id = cRows[0].customer_id;

    const { rows } = await db.query(
      `INSERT INTO reviews(customer_id,hotel_id,rating,comment)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [customer_id, hotel_id, rating, comment]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};
