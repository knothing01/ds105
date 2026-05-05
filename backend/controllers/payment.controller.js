const db = require('../db/connection');

exports.getAll = async (_, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, r.customer_id, r.reservation_status
         FROM payments p
         JOIN reservations r ON r.reservation_id = p.reservation_id
        ORDER BY p.date DESC LIMIT 100`
    );
    res.json(rows);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { reservation_id, payment_type, status = 'approved' } = req.body;
    const { rows } = await db.query(
      `INSERT INTO payments(reservation_id, payment_type, status)
       VALUES($1,$2,$3)
       ON CONFLICT (reservation_id) DO UPDATE SET payment_type=$2, status=$3, date=NOW()
       RETURNING *`,
      [reservation_id, payment_type, status]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};
