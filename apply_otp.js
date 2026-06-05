const fs = require('fs');

let server = fs.readFileSync('backend/server.js', 'utf8');

// 1. Inject Twilio & SendGrid initialization + helper function
if (!server.includes('sendRealOTP')) {
  const otpLogic = `
// ── OTP Delivery Services (Twilio & SendGrid) ────────────────────────────
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('Twilio configured ✅');
  } catch(e) { console.warn('Twilio initialization failed'); }
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid configured ✅');
}

/**
 * Dispatches an OTP via Email or SMS depending on the contact type.
 * Safely falls back to console.log if API keys are missing.
 */
async function sendRealOTP(contact, otp, isReset = false) {
  const isEmail = contact.includes('@');
  const actionText = isReset ? 'Password Reset' : 'Verification';

  try {
    if (isEmail) {
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        await sgMail.send({
          to: contact,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: \`Your P.G Chat \${actionText} Code\`,
          text: \`Your code is: \${otp}\`,
          html: \`<h3>P.G Chat \${actionText}</h3><p>Your code is: <strong>\${otp}</strong></p>\`
        });
        console.log(\`[SENDGRID] \${actionText} email sent to \${contact}\`);
      } else {
        console.log(\`[SIMULATED EMAIL] \${actionText} code for \${contact}: \${otp}\`);
      }
    } else {
      // Phone number
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        await twilioClient.messages.create({
          body: \`Your P.G Chat \${actionText} code is: \${otp}\`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: contact
        });
        console.log(\`[TWILIO] \${actionText} SMS sent to \${contact}\`);
      } else {
        console.log(\`[SIMULATED SMS] \${actionText} code for \${contact}: \${otp}\`);
      }
    }
  } catch (error) {
    console.error(\`Failed to send \${actionText} OTP to \${contact}:\`, error);
  }
}
// ─────────────────────────────────────────────────────────────────────────
`;
  server = server.replace("const db = require('./database');", "const db = require('./database');\n" + otpLogic);
}

// 2. Replace simulated console.logs inside the routes
// For send-verification
server = server.replace(/console\.log\(`\[SIMULATED EMAIL\/SMS\] Verification code for \$\{contact\}: \$\{otp\}`\);/g, `await sendRealOTP(contact, otp, false);`);

// For forgot-password
server = server.replace(/console\.log\(`\[SIMULATED EMAIL\/SMS\] Reset code for \$\{contact\}: \$\{otp\}`\);/g, `await sendRealOTP(contact, otp, true);`);

fs.writeFileSync('backend/server.js', server);

// 3. Update app.js
let app = fs.readFileSync('frontend-web/app.js', 'utf8');

app = app.replace(
  /alert\('Verification code sent to your Phone\/Email! \(Since this is a Sandbox, your code is: 123456\)'\);/g,
  "alert('Verification code sent to your Phone/Email!');"
);

app = app.replace(
  /alert\('Password Reset code sent to your Phone\/Email! \(Code: 123456\)'\);/g,
  "alert('Password Reset code sent to your Phone/Email!');"
);

fs.writeFileSync('frontend-web/app.js', app);
console.log('✅ OTP Updates Applied');
