const db = require('../db/connection');

exports.getAll = async (_, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, calculate_invoice_total(i.reservation_id) AS total
         FROM invoices i ORDER BY i.issue_date DESC LIMIT 100`
    );
    res.json(rows);
  } catch (e) { next(e); }
};

exports.getByReservation = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, calculate_invoice_total(i.reservation_id) AS total
         FROM invoices i WHERE i.reservation_id = $1`,
      [req.params.reservationId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*,
              calculate_invoice_total(i.reservation_id) AS total,
              r.customer_id, r.reservation_status,
              u.first_name || ' ' || u.last_name AS customer_name
         FROM invoices i
         JOIN reservations r ON r.reservation_id = i.reservation_id
         JOIN customers c    ON c.customer_id    = r.customer_id
         JOIN users u        ON u.user_id        = c.user_id
        WHERE i.invoice_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { reservation_id, discount = 0, tax = 0 } = req.body;
    const { rows } = await db.query(
      `INSERT INTO invoices(reservation_id, discount, tax)
       VALUES($1,$2,$3)
       ON CONFLICT (reservation_id) DO UPDATE SET discount=$2, tax=$3
       RETURNING *, calculate_invoice_total(reservation_id) AS total`,
      [reservation_id, discount, tax]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};
