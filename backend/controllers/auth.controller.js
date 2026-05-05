const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db/connection');

exports.register = async (req, res, next) => {
  const { login, password, first_name, last_name, email, phone, passport } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const hashed = await bcrypt.hash(password, 10);

    const { rows: uRows } = await client.query(
      'INSERT INTO users(first_name,last_name,phone,email) VALUES($1,$2,$3,$4) RETURNING user_id',
      [first_name, last_name, phone || null, email]
    );
    const user_id = uRows[0].user_id;

    await client.query(
      'INSERT INTO login(user_id,login,password) VALUES($1,$2,$3)',
      [user_id, login, hashed]
    );

    const { rows: cRows } = await client.query(
      'INSERT INTO customers(user_id,passport) VALUES($1,$2) RETURNING customer_id',
      [user_id, passport || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Registered', user_id, customer_id: cRows[0].customer_id });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body;

    const { rows } = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email,
              l.login, l.password,
              CASE
                WHEN a.admin_id    IS NOT NULL THEN 'admin'
                WHEN e.employee_id IS NOT NULL THEN 'employee'
                ELSE 'customer'
              END AS user_type,
              c.customer_id
         FROM login l
         JOIN users     u ON u.user_id    = l.user_id
         LEFT JOIN admins    a ON a.user_id    = l.user_id
         LEFT JOIN employees e ON e.user_id    = l.user_id
         LEFT JOIN customers c ON c.user_id    = l.user_id
        WHERE l.login = $1`,
      [login]
    );

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { user_id: user.user_id, user_type: user.user_type, login: user.login },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id:          user.user_id,
        customer_id: user.customer_id,
        login:       user.login,
        first_name:  user.first_name,
        last_name:   user.last_name,
        type:        user.user_type,
      },
    });
  } catch (err) { next(err); }
};
