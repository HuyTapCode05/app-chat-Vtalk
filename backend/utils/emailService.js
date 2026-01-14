/**
 * Email Service
 * Handles sending verification emails (OTP and verification links)
 * 
 * Note: For production, configure SMTP settings in .env
 * For development, emails are logged to console
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter (use console for development, SMTP for production)
const createTransporter = () => {
  // Development mode: log emails to console if SMTP not configured
  if ((process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && !process.env.SMTP_HOST) {
    return {
      sendMail: async (options) => {
        console.log('\n📧 ===== EMAIL (Development Mode) =====');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Text:', options.text);
        if (options.html) {
          console.log('HTML:', options.html);
        }
        console.log('=====================================\n');
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  // Production mode: use SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

/**
 * Send OTP verification email
 */
const sendOTPEmail = async (email, code, userName = 'User') => {
  const subject = 'Mã xác thực VTalk';
  const text = `
Xin chào ${userName},

Mã xác thực email của bạn là: ${code}

Mã này có hiệu lực trong 10 phút.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ VTalk
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00B14F, #008037); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code { background: #fff; border: 2px dashed #00B14F; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #00B14F; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VTalk</h1>
      <p>Xác thực Email</p>
    </div>
    <div class="content">
      <p>Xin chào <strong>${userName}</strong>,</p>
      <p>Mã xác thực email của bạn là:</p>
      <div class="code">${code}</div>
      <p>Mã này có hiệu lực trong <strong>10 phút</strong>.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <div class="footer">
        <p>Trân trọng,<br>Đội ngũ VTalk</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'VTalk <noreply@vtalk.com>',
      to: email,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

/**
 * Send verification link email
 */
const sendVerificationLinkEmail = async (email, token, userName = 'User') => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  const appUrl = `vtalk://verify-email?token=${token}`; // Deep link for mobile app

  const subject = 'Xác thực Email VTalk';
  const text = `
Xin chào ${userName},

Vui lòng click vào link sau để xác thực email của bạn:

${verificationUrl}

Hoặc mở ứng dụng VTalk và nhập mã: ${token.substring(0, 8)}

Link này có hiệu lực trong 24 giờ.

Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ VTalk
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00B14F, #008037); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #00B14F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .code { background: #fff; border: 2px dashed #00B14F; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; color: #00B14F; margin: 20px 0; border-radius: 8px; font-family: monospace; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VTalk</h1>
      <p>Xác thực Email</p>
    </div>
    <div class="content">
      <p>Xin chào <strong>${userName}</strong>,</p>
      <p>Vui lòng click vào nút bên dưới để xác thực email của bạn:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Xác thực Email</a>
      </div>
      <p>Hoặc mở ứng dụng VTalk và nhập mã:</p>
      <div class="code">${token.substring(0, 8)}</div>
      <p>Link này có hiệu lực trong <strong>24 giờ</strong>.</p>
      <p>Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email này.</p>
      <div class="footer">
        <p>Trân trọng,<br>Đội ngũ VTalk</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'VTalk <noreply@vtalk.com>',
      to: email,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending verification link email:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendVerificationLinkEmail,
};

