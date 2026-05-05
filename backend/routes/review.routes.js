const router = require('express').Router();
const c = require('../controllers/review.controller');
const { authenticate } = require('../middleware/auth');
router.get('/',  c.getAll);
router.post('/', authenticate, c.create);
module.exports = router;
