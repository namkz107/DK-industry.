const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuth = require('./middleware/adminAuth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, leadLimiter, rejectUnsafeKeys } = require('./middleware/security');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:3000' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', apiLimiter, rejectUnsafeKeys);
app.use('/api/leads', leadLimiter);
app.use('/api', publicRoutes);
app.use('/api/admin', adminAuth, adminRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
