const router = require('express').Router();
const c = require('../controllers/reservation.controller');
const { authenticate } = require('../middleware/auth');
router.get('/',            c.getAll);
router.get('/:id',         c.getById);
router.post('/',           authenticate, c.create);
router.put('/:id/status',  c.updateStatus);
router.delete('/:id',      c.remove);
module.exports = router;
