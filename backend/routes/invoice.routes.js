const router = require('express').Router();
const c = require('../controllers/invoice.controller');
router.get('/',                          c.getAll);
router.get('/by-reservation/:reservationId', c.getByReservation);
router.get('/:id',                       c.getById);
router.post('/',                         c.create);
module.exports = router;
