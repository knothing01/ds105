const router = require('express').Router();
const c = require('../controllers/room.controller');

router.get('/available',                      c.getAvailable);
router.get('/overnight',                      c.getOvernightRooms);
router.get('/overnight/:hotel_id/:room_number', c.getOvernightById);
router.get('/meeting/available',              c.getAvailableMeeting);
router.get('/meeting',                        c.getMeetingRooms);
router.get('/meeting/:hotel_id/:room_number',   c.getMeetingById);
router.post('/overnight',                     c.createOvernight);
router.post('/meeting',                       c.createMeeting);
router.put('/overnight/:hotel_id/:room_number', c.updateOvernight);
router.put('/meeting/:hotel_id/:room_number',   c.updateMeeting);

module.exports = router;
