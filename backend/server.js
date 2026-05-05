// server.js — entry point for the Hotel Reservation REST API
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const authRoutes        = require('./routes/auth.routes');
const customerRoutes    = require('./routes/customer.routes');
const hotelRoutes       = require('./routes/hotel.routes');
const roomRoutes        = require('./routes/room.routes');
const reservationRoutes = require('./routes/reservation.routes');
const paymentRoutes     = require('./routes/payment.routes');
const invoiceRoutes     = require('./routes/invoice.routes');
const reviewRoutes      = require('./routes/review.routes');
const employeeRoutes    = require('./routes/employee.routes');
const serviceRoutes     = require('./routes/service.routes');
const reportRoutes      = require('./routes/report.routes');
const errorHandler      = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API routes
app.use('/api/auth',         authRoutes);
app.use('/api/customers',    customerRoutes);
app.use('/api/hotels',       hotelRoutes);
app.use('/api/rooms',        roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/reviews',      reviewRoutes);
app.use('/api/employees',    employeeRoutes);
app.use('/api/services',     serviceRoutes);
app.use('/api/reports',      reportRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✓ API running on port ${PORT}`));
