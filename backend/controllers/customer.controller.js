const db = require('../db/connection');

exports.getAll = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.customer_id, c.user_id, c.passport,
              u.first_name, u.last_name, u.email, u.phone,
              l.login
         FROM customers c
         JOIN users u ON u.user_id = c.user_id
         JOIN login l ON l.user_id = c.user_id
        ORDER BY c.customer_id LIMIT 100`
    );
    res.json(rows);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.customer_id, c.user_id, c.passport,
              u.first_name, u.last_name, u.email, u.phone,
              l.login
         FROM customers c
         JOIN users u ON u.user_id = c.user_id
         JOIN login l ON l.user_id = c.user_id
        WHERE c.customer_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { first_name, last_name, email, phone, passport } = req.body;
    await client.query('BEGIN');

    const { rows: cRows } = await client.query(
      'SELECT user_id FROM customers WHERE customer_id=$1', [req.params.id]
    );
    if (!cRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    await client.query(
      'UPDATE users SET first_name=$1,last_name=$2,email=$3,phone=$4 WHERE user_id=$5',
      [first_name, last_name, email, phone, cRows[0].user_id]
    );
    const { rows } = await client.query(
      'UPDATE customers SET passport=$1 WHERE customer_id=$2 RETURNING *',
      [passport, req.params.id]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM customers WHERE customer_id=$1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
};
