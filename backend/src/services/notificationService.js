const Notification = require('../models/Notification');
const User = require('../models/User');

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM || process.env.EMAIL_FROM));
}

function mailTransport(nodemailer) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    disableFileAccess: true,
    disableUrlAccess: true
  });
}

async function sendDirectEmail({ to, subject, text }) {
  if (!smtpConfigured()) return false;
  try {
    const nodemailer = require('nodemailer');
    await mailTransport(nodemailer).sendMail({ from: process.env.SMTP_FROM || process.env.EMAIL_FROM, to, subject, text });
    return true;
  } catch (error) {
    console.error('Direct email failed:', error.message);
    return false;
  }
}

async function createNotification({ recipient, type, title, message, link = '', metadata = {}, email = '', session = null }) {
  try {
    const document = {
      recipient, type, title, message, link, metadata,
      email: email && smtpConfigured()
        ? { address: email, status: 'pending' }
        : { address: email || '', status: 'not_requested' }
    };
    const created = await Notification.create([document], session ? { session } : undefined);
    return created[0];
  } catch (error) {
    if (session) throw error;
    console.error('Cannot create notification:', error.message);
    return null;
  }
}

async function notifyOperations(payload, session = null) {
  try {
    const query = User.find({ role: { $in: ['staff', 'admin'] }, status: 'active' }).select('_id email').lean();
    if (session) query.session(session);
    const recipients = await query;
    return Promise.all(recipients.map(user => createNotification({ ...payload, recipient: user._id, email: user.email, session })));
  } catch (error) {
    if (session) throw error;
    console.error('Cannot notify operations:', error.message);
    return [];
  }
}

async function dispatchPendingEmails(limit = 25) {
  if (!smtpConfigured()) return { sent: 0, failed: 0 };
  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch { return { sent: 0, failed: 0 }; }
  const transporter = mailTransport(nodemailer);
  const pending = await Notification.find({ 'email.status': 'pending', 'email.address': { $ne: '' } }).sort({ createdAt: 1 }).limit(limit);
  let sent = 0;
  let failed = 0;
  for (const notification of pending) {
    try {
      const baseUrl = (process.env.CLIENT_URL || '').split(',')[0];
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM,
        to: notification.email.address,
        subject: notification.title,
        text: `${notification.message}${notification.link ? `\n\n${baseUrl}${notification.link}` : ''}`
      });
      notification.email.status = 'sent';
      notification.email.sentAt = new Date();
      notification.email.error = undefined;
      sent += 1;
    } catch (error) {
      notification.email.status = 'failed';
      notification.email.error = String(error.message || error).slice(0, 500);
      failed += 1;
    }
    await notification.save();
  }
  return { sent, failed };
}

function dispatchSoon() {
  setImmediate(() => dispatchPendingEmails().catch(error => console.error('Notification email dispatch failed:', error.message)));
}

module.exports = { createNotification, notifyOperations, dispatchPendingEmails, dispatchSoon, smtpConfigured, sendDirectEmail };
