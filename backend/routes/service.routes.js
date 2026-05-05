const router = require('express').Router();
const c = require('../controllers/service.controller');
router.get('/',                            c.getAll);
router.post('/',                           c.create);
router.put('/:hotel_id/:service_name',     c.update);
router.delete('/:hotel_id/:service_name',  c.remove);
module.exports = router;
