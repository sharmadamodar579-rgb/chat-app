require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');

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
          subject: `Your P.G Chat ${actionText} Code`,
          text: `Your code is: ${otp}`,
          html: `<h3>P.G Chat ${actionText}</h3><p>Your code is: <strong>${otp}</strong></p>`
        });
        console.log(`[SENDGRID] ${actionText} email sent to ${contact}`);
      } else {
        console.log(`[SIMULATED EMAIL] ${actionText} code for ${contact}: ${otp}`);
      }
    } else {
      // Phone number
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        await twilioClient.messages.create({
          body: `Your P.G Chat ${actionText} code is: ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: contact
        });
        console.log(`[TWILIO] ${actionText} SMS sent to ${contact}`);
      } else {
        console.log(`[SIMULATED SMS] ${actionText} code for ${contact}: ${otp}`);
      }
    }
  } catch (error) {
    console.error(`Failed to send ${actionText} OTP to ${contact}:`, error);
  }
}
// ─────────────────────────────────────────────────────────────────────────


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; media-src 'self' data: blob: https://res.cloudinary.com; connect-src 'self'");
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend-web')));

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// 1. Get all registered profiles

app.get('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await db.queryGet('SELECT id, username, profile_picture, bio FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.queryAll(`SELECT * FROM users WHERE deactivated_at IS NULL ORDER BY username ASC`);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.5. Update User Bio
app.post('/api/users/update-bio', async (req, res) => {
  const { username, bio } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }
  try {
    await db.queryRun(`UPDATE users SET bio = ? WHERE username = ?`, [bio || '', username]);
    res.json({ success: true, bio: bio || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.55. Update User Avatar
app.post('/api/users/update-avatar', async (req, res) => {
  const { username, avatarUrl } = req.body;
  if (!username || !avatarUrl) {
    return res.status(400).json({ error: 'Missing username or avatarUrl' });
  }
  try {
    await db.queryRun(`UPDATE users SET profile_picture = ? WHERE username = ?`, [avatarUrl, username]);
    res.json({ success: true, avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 1.6. Register E2EE Public, Wrapped Private, and Admin Escrow Keys
app.post('/api/users/register-keys', async (req, res) => {
  const { username, public_key, wrapped_private_key, admin_wrapped_private_key } = req.body;
  if (!username || !public_key || !wrapped_private_key || !admin_wrapped_private_key) {
    return res.status(400).json({ error: 'Missing key parameters' });
  }
  try {
    await db.queryRun(
      `UPDATE users SET public_key = ?, wrapped_private_key = ?, admin_wrapped_private_key = ? WHERE username = ?`,
      [public_key, wrapped_private_key, admin_wrapped_private_key, username]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTHENTICATION & LOGIN API ENDPOINTS ---

const otpStore = {};

// Purge deactivated accounts that have exceeded the 10-day grace period
async function purgeDeactivatedAccounts() {
  try {
    const deactivated = await db.queryAll(`SELECT username, deactivated_at FROM users WHERE deactivated_at IS NOT NULL`);
    const now = Date.now();
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    
    for (let u of deactivated) {
      const deactTime = new Date(u.deactivated_at).getTime();
      if (now - deactTime > tenDaysMs) {
        const username = u.username;
        console.log(`Grace period exceeded. Permanently purging user @${username}...`);
        await db.queryRun(`DELETE FROM followers WHERE follower = ? OR following = ?`, [username, username]);
        await db.queryRun(`DELETE FROM posts WHERE username = ?`, [username]);
        await db.queryRun(`DELETE FROM likes WHERE username = ?`, [username]);
        await db.queryRun(`DELETE FROM comments WHERE username = ?`, [username]);
        await db.queryRun(`DELETE FROM stories WHERE username = ?`, [username]);
        await db.queryRun(`DELETE FROM saved_posts WHERE username = ?`, [username]);
        await db.queryRun(`DELETE FROM login_sessions WHERE username = ?`, [username]);
        await db.queryRun(`DELETE FROM messages WHERE sender = ? OR receiver = ?`, [username, username]);
        await db.queryRun(`DELETE FROM users WHERE username = ?`, [username]);
      }
    }
  } catch (err) {
    console.error('Error during deactivated accounts purge:', err);
  }
}

// Register a new user account
app.post('/api/auth/signup', async (req, res) => {
  const { email, phone, username, password, public_key, wrapped_private_key, admin_wrapped_private_key, is_private } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Admin username restriction
  if (username.toLowerCase() === 'admin') {
    if (email !== 'pg9152766@gmail.com') {
      return res.status(400).json({ error: "The username 'admin' is reserved and can only be registered with the authorized admin email." });
    }
  }

  try {
    // Check if username is already taken
    const existing = await db.queryGet(`SELECT * FROM users WHERE username = ?`, [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check if email is already taken
    if (email) {
      const existingEmail = await db.queryGet(`SELECT * FROM users WHERE email = ?`, [email]);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
    }

    // Check if phone is already taken
    if (phone) {
      const existingPhone = await db.queryGet(`SELECT * FROM users WHERE phone = ?`, [phone]);
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number is already registered' });
      }
    }

    // Hash password (case sensitive)
    const passwordHash = bcrypt.hashSync(password, 10);
    const profilePicture = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    const bio = 'Hey there! I am using P.G';
    const isPrivate = is_private ? 1 : 0;

    await db.queryRun(
      `INSERT INTO users (username, profile_picture, bio, password_hash, email, phone, public_key, wrapped_private_key, admin_wrapped_private_key, is_private) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, profilePicture, bio, passwordHash, email || null, phone || null, public_key || null, wrapped_private_key || null, admin_wrapped_private_key || null, isPrivate]
    );

    // Log login session
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    await db.queryRun(
      `INSERT INTO login_sessions (username, ip_address, user_agent) VALUES (?, ?, ?)`,
      [username, ip, userAgent]
    );

    const user = await db.queryGet(`SELECT * FROM users WHERE username = ?`, [username]);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticate / Login user
app.post('/api/auth/login', async (req, res) => {
  const { credential, password } = req.body; // username, email, or phone
  if (!credential || !password) {
    return res.status(400).json({ error: 'Credential and password are required' });
  }

  try {
    // Purge expired accounts before doing login queries
    await purgeDeactivatedAccounts();

    let user = await db.queryGet(
      `SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?`,
      [credential, credential, credential]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials. User not found.' });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid password. Match failed.' });
    }

    // Check deactivation status and reactivate if active
    let reactivated = false;
    if (user.deactivated_at) {
      await db.queryRun(`UPDATE users SET deactivated_at = NULL WHERE username = ?`, [user.username]);
      user.deactivated_at = null;
      reactivated = true;
      console.log(`Reactivated profile for @${user.username} upon successful login.`);
    }

    // Log login session
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    await db.queryRun(
      `INSERT INTO login_sessions (username, ip_address, user_agent) VALUES (?, ?, ?)`,
      [user.username, ip, userAgent]
    );

    res.json({ success: true, user, reactivated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send simulated forgot password verification code
app.post('/api/auth/forgot-password/send-code', async (req, res) => {
  const { contact } = req.body; // email or phone
  if (!contact) {
    return res.status(400).json({ error: 'Contact details are required' });
  }

  try {
    const user = await db.queryGet(
      `SELECT * FROM users WHERE email = ? OR phone = ?`,
      [contact, contact]
    );

    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email or phone.' });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in-memory with 5-minute expiration
    otpStore[contact] = {
      code: code,
      expires: Date.now() + 5 * 60 * 1000
    };

    console.log(`[simulated code to ${contact}]: Your P.G reset code is ${code}`);

    res.json({ success: true, code: code, message: `Verification code sent to ${contact}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify forgot password code & reset password
app.post('/api/auth/forgot-password/verify-code', async (req, res) => {
  const { contact, code, newPassword } = req.body;
  if (!contact || !code || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const storedOtp = otpStore[contact];
  if (!storedOtp) {
    return res.status(400).json({ error: 'No verification code found. Request a new code.' });
  }

  if (Date.now() > storedOtp.expires) {
    delete otpStore[contact];
    return res.status(400).json({ error: 'Verification code has expired.' });
  }

  if (storedOtp.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  try {
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.queryRun(
      `UPDATE users SET password_hash = ? WHERE email = ? OR phone = ?`,
      [hashed, contact, contact]
    );

    delete otpStore[contact];
    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send simulated signup verification code
app.post('/api/auth/signup/send-code', async (req, res) => {
  const { contact } = req.body; // email or phone
  if (!contact) {
    return res.status(400).json({ error: 'Contact details are required' });
  }

  try {
    // Check if email or phone is already registered
    const existing = await db.queryGet(
      `SELECT * FROM users WHERE email = ? OR phone = ?`,
      [contact, contact]
    );

    if (existing) {
      return res.status(400).json({ error: 'This contact details are already registered.' });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in-memory with 5-minute expiration
    otpStore[contact] = {
      code: code,
      expires: Date.now() + 5 * 60 * 1000
    };

    console.log(`[simulated signup code to ${contact}]: Your P.G signup code is ${code}`);

    res.json({ success: true, code: code, message: `Verification code sent to ${contact}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify signup verification code
app.post('/api/auth/signup/verify-code', async (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) {
    return res.status(400).json({ error: 'Contact and code are required.' });
  }

  const storedOtp = otpStore[contact];
  if (!storedOtp) {
    return res.status(400).json({ error: 'No verification code found. Request a new code.' });
  }

  if (Date.now() > storedOtp.expires) {
    delete otpStore[contact];
    return res.status(400).json({ error: 'Verification code has expired.' });
  }

  if (storedOtp.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  res.json({ success: true, message: 'Contact verified successfully.' });
});

// Admin download database endpoint
app.get('/api/admin/download/:dbName', async (req, res) => {
  const { dbName } = req.params;
  
  if (dbName !== 'pg.db' && dbName !== 'vault.db') {
    return res.status(400).json({ error: 'Invalid database name requested' });
  }

  const filePath = path.join(__dirname, dbName);
  res.download(filePath, dbName, (err) => {
    if (err) {
      console.error('Error downloading database file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    }
  });
});

// 2. Fetch User Feed (Posts & Reels of followed users + own posts)
app.get('/api/posts/feed/:username', async (req, res) => {
  const { username } = req.params;
  try {
    // Get posts from people the user follows OR their own posts. 
    // Fallback: If Bob doesn't follow anyone, just return ALL posts so the sandbox isn't empty.
    const follows = await db.queryAll(`SELECT following FROM followers WHERE follower = ?`, [username]);
    
    let posts;
    if (follows.length === 0) {
      // Return all posts for rich testing
      posts = await db.queryAll(`
        SELECT p.*, u.profile_picture,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND username = ?) AS user_liked
        FROM posts p
        JOIN users u ON p.username = u.username
        WHERE u.deactivated_at IS NULL
        ORDER BY p.created_at DESC
      `, [username]);
    } else {
      const followNames = follows.map(f => f.following);
      followNames.push(username); // Include own posts
      const placeholders = followNames.map(() => '?').join(',');
      
      posts = await db.queryAll(`
        SELECT p.*, u.profile_picture,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND username = ?) AS user_liked
        FROM posts p
        JOIN users u ON p.username = u.username
        WHERE p.username IN (${placeholders}) AND u.deactivated_at IS NULL
        ORDER BY p.created_at DESC
      `, [username, ...followNames]);
    }

    // Attach comments to each post
    for (let post of posts) {
      post.comments = await db.queryAll(`
        SELECT c.*, u.profile_picture 
        FROM comments c
        JOIN users u ON c.username = u.username
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `, [post.id]);
    }

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch Reels (Only type='reel')
app.get('/api/posts/reels', async (req, res) => {
  try {
    const reels = await db.queryAll(`
      SELECT p.*, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count
      FROM posts p
      JOIN users u ON p.username = u.username
      WHERE p.type = 'reel' AND u.deactivated_at IS NULL
      ORDER BY p.created_at DESC
    `);
    
    // Attach comments to each reel
    for (let reel of reels) {
      reel.comments = await db.queryAll(`
        SELECT c.*, u.profile_picture 
        FROM comments c
        JOIN users u ON c.username = u.username
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `, [reel.id]);
    }
    
    res.json(reels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Create Post or Reel

let _cloudinary = null;
try {
  _cloudinary = require('cloudinary').v2;
} catch(e) {}

app.post('/api/upload', async (req, res) => {
  const { data, folder } = req.body;
  if (!data) return res.status(400).json({ error: 'No data' });
  if (!_cloudinary || !process.env.CLOUDINARY_URL) return res.json({ url: data });
  try {
    _cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
    const result = await _cloudinary.uploader.upload(data, { folder: folder || 'pg-chat', resource_type: 'auto' });
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/create', async (req, res) => {
  const { username, type, media_url, caption } = req.body;
  if (!username || !type || !media_url) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  try {
    await db.queryRun(
      `INSERT INTO posts (username, type, media_url, caption) VALUES (?, ?, ?, ?)`,
      [username, type, media_url, caption || '']
    );
    res.json({ success: true, message: `${type} created successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Toggle Like
app.post('/api/posts/like', async (req, res) => {
  const { post_id, username } = req.body;
  if (!post_id || !username) {
    return res.status(400).json({ error: 'Missing post_id or username' });
  }
  try {
    const existing = await db.queryGet(
      `SELECT * FROM likes WHERE post_id = ? AND username = ?`,
      [post_id, username]
    );
    if (existing) {
      await db.queryRun(`DELETE FROM likes WHERE post_id = ? AND username = ?`, [post_id, username]);
      res.json({ liked: false });
    } else {
      await db.queryRun(`INSERT INTO likes (post_id, username) VALUES (?, ?)`, [post_id, username]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Comment on Post
app.post('/api/posts/comment', async (req, res) => {
  const { post_id, username, comment_text } = req.body;
  if (!post_id || !username || !comment_text) {
    return res.status(400).json({ error: 'Missing post_id, username, or comment_text' });
  }
  try {
    await db.queryRun(
      `INSERT INTO comments (post_id, username, comment_text) VALUES (?, ?, ?)`,
      [post_id, username, comment_text]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get Active Stories (lasts 24h, but for sandbox we display all seeded/active stories)
app.get('/api/stories/active', async (req, res) => {
  try {
    const stories = await db.queryAll(`
      SELECT s.*, u.profile_picture
      FROM stories s
      JOIN users u ON s.username = u.username
      WHERE u.deactivated_at IS NULL
      ORDER BY s.created_at DESC
    `);
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Create Story
app.post('/api/stories/create', async (req, res) => {
  const { username, media_url } = req.body;
  if (!username || !media_url) {
    return res.status(400).json({ error: 'Missing username or media_url' });
  }
  try {
    await db.queryRun(`INSERT INTO stories (username, media_url) VALUES (?, ?)`, [username, media_url]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Get Messages / Chat Thread
app.get('/api/messages/chat/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const chat = await db.queryAll(`
      SELECT * FROM messages
      WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
      ORDER BY created_at ASC
    `, [user1, user2, user2, user1]);
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Send Message (Chat DM or disappearing Pic)
app.post('/api/messages/send', async (req, res) => {
  const { sender, receiver, content, type } = req.body;
  if (!sender || !receiver || !content || !type) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    await db.queryRun(
      `INSERT INTO messages (sender, receiver, content, type, is_opened) VALUES (?, ?, ?, ?, 0)`,
      [sender, receiver, content, type]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Open Disappearing Pic
app.post('/api/messages/open-pic/:msgId', async (req, res) => {
  const { msgId } = req.params;
  try {
    // Mark pic as opened. In the sandbox, once marked opened, its content will be replaced by empty or handled by UI
    await db.queryRun(`UPDATE messages SET is_opened = 1 WHERE id = ?`, [msgId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11b. Get unread messages counts grouped by sender
app.get('/api/messages/unread-counts/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const counts = await db.queryAll(`
      SELECT sender, COUNT(*) as count FROM messages
      WHERE receiver = ? AND is_read = 0
      GROUP BY sender
    `, [username]);
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11c. Mark all messages in a thread as read
app.post('/api/messages/read-all', async (req, res) => {
  const { sender, receiver } = req.body;
  if (!sender || !receiver) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    await db.queryRun(`
      UPDATE messages SET is_read = 1
      WHERE sender = ? AND receiver = ? AND is_read = 0
    `, [sender, receiver]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11d. Delete chat history between two users
app.post('/api/messages/delete-thread', async (req, res) => {
  const { user1, user2 } = req.body;
  if (!user1 || !user2) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    await db.queryRun(`
      DELETE FROM messages
      WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
    `, [user1, user2, user2, user1]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Follow Relation actions
app.post('/api/social/follow', async (req, res) => {
  const { follower, following } = req.body;
  if (!follower || !following) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const existing = await db.queryGet(
      `SELECT * FROM followers WHERE follower = ? AND following = ?`,
      [follower, following]
    );
    if (existing) {
      await db.queryRun(`DELETE FROM followers WHERE follower = ? AND following = ?`, [follower, following]);
      res.json({ following: false });
    } else {
      await db.queryRun(`INSERT INTO followers (follower, following) VALUES (?, ?)`, [follower, following]);
      res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEW SOCIAL CONTROLS, SAVING, DEACTIVATION & ABOUT APIs ---

// 14. Update user account privacy (Public / Private)
app.post('/api/users/update-privacy', async (req, res) => {
  const { username, isPrivate } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }
  try {
    await db.queryRun(`UPDATE users SET is_private = ? WHERE username = ?`, [isPrivate ? 1 : 0, username]);
    res.json({ success: true, is_private: isPrivate ? 1 : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Fetch device login sessions for user
app.get('/api/users/sessions/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const sessions = await db.queryAll(
      `SELECT * FROM login_sessions WHERE username = ? ORDER BY login_time DESC LIMIT 20`,
      [username]
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Deactivate account (sets deactivation timestamp)
app.post('/api/users/deactivate', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }
  try {
    await db.queryRun(`UPDATE users SET deactivated_at = CURRENT_TIMESTAMP WHERE username = ?`, [username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17. Toggle saved post status for user
app.post('/api/posts/save', async (req, res) => {
  const { username, postId } = req.body;
  if (!username || !postId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const existing = await db.queryGet(`SELECT * FROM saved_posts WHERE username = ? AND post_id = ?`, [username, postId]);
    if (existing) {
      await db.queryRun(`DELETE FROM saved_posts WHERE username = ? AND post_id = ?`, [username, postId]);
      res.json({ success: true, saved: false });
    } else {
      await db.queryRun(`INSERT INTO saved_posts (username, post_id) VALUES (?, ?)`, [username, postId]);
      res.json({ success: true, saved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Retrieve all saved posts for user
app.get('/api/posts/saved/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const posts = await db.queryAll(`
      SELECT p.*, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND username = ?) AS user_liked
      FROM posts p
      JOIN saved_posts s ON p.id = s.post_id
      JOIN users u ON p.username = u.username
      WHERE s.username = ? AND u.deactivated_at IS NULL
      ORDER BY p.created_at DESC
    `, [username, username]);

    // Attach comments to each post
    for (let post of posts) {
      post.comments = await db.queryAll(`
        SELECT c.*, u.profile_picture 
        FROM comments c
        JOIN users u ON c.username = u.username
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `, [post.id]);
    }

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 19. Delete post (Reel or Post)

app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const username = req.query.username || (req.body && req.body.username);
  if (!username) return res.status(401).json({ error: 'Username required' });
  try {
    const post = await db.queryGet('SELECT username FROM posts WHERE id = ?', [id]);
    if (!post || (post.username !== username && username !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.queryRun(`DELETE FROM posts WHERE id = ?`, [id]);
    await db.queryRun(`DELETE FROM likes WHERE post_id = ?`, [id]);
    await db.queryRun(`DELETE FROM comments WHERE post_id = ?`, [id]);
    await db.queryRun(`DELETE FROM saved_posts WHERE post_id = ?`, [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/stories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.queryRun(`DELETE FROM stories WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// 20. App Info: Get About description
app.get('/api/app-info/about', async (req, res) => {
  try {
    const info = await db.queryGet(`SELECT value FROM app_info WHERE key = 'about'`);
    res.json({ about: info ? info.value : '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 21. App Info: Update About description (Admin only)
app.post('/api/app-info/about', async (req, res) => {
  const { username, aboutText } = req.body;
  if (username !== 'admin') {
    return res.status(403).json({ error: 'Permission denied. Only admin can modify App About page.' });
  }
  try {
    await db.queryRun(
      `INSERT INTO app_info (key, value) VALUES ('about', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [aboutText]
    );
    res.json({ success: true, about: aboutText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`P.G Server running on port ${PORT}`);
});
