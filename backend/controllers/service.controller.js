const db = require('../db/connection');

exports.getAll = async (req, res, next) => {
  try {
    const { hotel_id } = req.query;
    const params = []; let where = '';
    if (hotel_id) { params.push(hotel_id); where = 'WHERE hotel_id = $1'; }
    const { rows } = await db.query(
      `SELECT * FROM services ${where} ORDER BY hotel_id, service_name LIMIT 200`, params);
    res.json(rows);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { hotel_id, service_name, charge } = req.body;
    const { rows } = await db.query(
      `INSERT INTO services(hotel_id,service_name,charge) VALUES($1,$2,$3) RETURNING *`,
      [hotel_id, service_name, charge]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { charge } = req.body;
    const { rows } = await db.query(
      `UPDATE services SET charge=$1 WHERE hotel_id=$2 AND service_name=$3 RETURNING *`,
      [charge, req.params.hotel_id, req.params.service_name]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM services WHERE hotel_id=$1 AND service_name=$2',
      [req.params.hotel_id, req.params.service_name]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
};
