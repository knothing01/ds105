const db = require('../db/connection');

exports.getAll = async (req, res, next) => {
  try {
    const { hotel_id } = req.query;
    const params = []; let where = '';
    if (hotel_id) { params.push(hotel_id); where = 'WHERE e.works_at = $1'; }

    const { rows } = await db.query(
      `SELECT e.employee_id, e.user_id, e.works_at AS hotel_id, e.role, e.hire_date,
              e.supervisor_id,
              u.first_name, u.last_name, u.email, u.phone,
              h.hotel_name,
              sup.first_name || ' ' || sup.last_name AS supervisor_name
         FROM employees e
         JOIN users u  ON u.user_id   = e.user_id
         JOIN hotels h ON h.hotel_id  = e.works_at
         LEFT JOIN employees se  ON se.employee_id = e.supervisor_id
         LEFT JOIN users    sup ON sup.user_id      = se.user_id
        ${where}
        ORDER BY e.employee_id LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
};

// Create employee — also creates user + login if user_id not supplied
exports.create = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { user_id, hotel_id, role, hire_date, supervisor_id,
            first_name, last_name, email, phone, login: loginName, password } = req.body;

    await client.query('BEGIN');
    let uid = user_id;

    if (!uid) {
      const bcrypt = require('bcryptjs');
      const { rows: uRows } = await client.query(
        'INSERT INTO users(first_name,last_name,phone,email) VALUES($1,$2,$3,$4) RETURNING user_id',
        [first_name, last_name, phone || null, email]
      );
      uid = uRows[0].user_id;
      if (loginName && password) {
        const hashed = await bcrypt.hash(password, 10);
        await client.query(
          'INSERT INTO login(user_id,login,password) VALUES($1,$2,$3)',
          [uid, loginName, hashed]
        );
      }
    }

    const { rows } = await client.query(
      `INSERT INTO employees(user_id,works_at,role,hire_date,supervisor_id)
       VALUES($1,$2,$3,COALESCE($4,CURRENT_DATE),$5) RETURNING *`,
      [uid, hotel_id, role, hire_date, supervisor_id || null]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
};

exports.update = async (req, res, next) => {
  try {
    const { role, phone, email } = req.body;
    const { rows } = await db.query(
      `UPDATE employees SET role=$1 WHERE employee_id=$2 RETURNING *`,
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (phone || email) {
      await db.query(
        `UPDATE users SET phone=COALESCE($1,phone), email=COALESCE($2,email) WHERE user_id=$3`,
        [phone, email, rows[0].user_id]
      );
    }
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM employees WHERE employee_id=$1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
};
