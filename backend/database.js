const sqlite3 = require('sqlite3').verbose();
const pg = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');

const isPostgres = !!process.env.DATABASE_URL;
let db = null;
let pgPool = null;

if (isPostgres) {
  console.log('PostgreSQL (Supabase/Render) database connection detected.');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for secure database connections on Supabase/Render
  });
} else {
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'pg.db');
  console.log('SQLite local database connection active:', dbPath);
  db = new sqlite3.Database(dbPath);
}

// SQL query placeholder translator
function translateSQL(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Create tables and seed data
async function initDatabase() {
  if (isPostgres) {
    try {
      // 1. Create Tables in PostgreSQL if they don't exist
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(100) PRIMARY KEY,
          profile_picture TEXT,
          bio TEXT,
          password_hash TEXT NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          public_key TEXT,
          wrapped_private_key TEXT,
          admin_wrapped_private_key TEXT,
          is_private INTEGER DEFAULT 0,
          deactivated_at TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS followers (
          follower VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          following VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          PRIMARY KEY (follower, following)
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          media_url TEXT NOT NULL,
          caption TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS likes (
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          username VARCHAR(100) REFERENCES users(username) ON DELETE CASCADE,
          PRIMARY KEY (post_id, username)
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          username VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          receiver VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          content TEXT NOT NULL,
          type VARCHAR(20) NOT NULL,
          is_opened INTEGER DEFAULT 0,
          is_read INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS stories (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          media_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS saved_posts (
          username VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          PRIMARY KEY (username, post_id)
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS login_sessions (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
          ip_address VARCHAR(100),
          user_agent TEXT,
          login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS app_info (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT
        )
      `);

      // Seed data if empty
      const userCountRes = await pgPool.query("SELECT COUNT(*) FROM users");
      const userCount = parseInt(userCountRes.rows[0].count, 10);
      if (userCount === 0) {
        console.log('PostgreSQL Database is empty. Seeding data...');
        await pgPool.query(`INSERT INTO app_info (key, value) VALUES ('about', 'Welcome to P.G Chat App - a secure, E2EE social sandbox experience where users can safely share posts, reels, stories, and messages with advanced privacy controls and social features.') ON CONFLICT(key) DO NOTHING`);

        const defaultHash = bcrypt.hashSync('password123', 10);
        const users = [
          ['alice', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Photographer & Digital Artist 🎨', defaultHash, 'alice@pg.com', '+1234567891'],
          ['bob', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'Traveler & Filmmaker 🎬', defaultHash, 'bob@pg.com', '+1234567892'],
          ['charlie', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', 'Musician & Tech Lover 🎵', defaultHash, 'charlie@pg.com', '+1234567893'],
          ['diana', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'Fitness coach & blogger 💪', defaultHash, 'diana@pg.com', '+1234567894'],
          ['admin', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'System Administrator 👑', defaultHash, 'pg9152766@gmail.com', '+1234567890']
        ];
        for (const u of users) {
          await pgPool.query("INSERT INTO users (username, profile_picture, bio, password_hash, email, phone) VALUES ($1, $2, $3, $4, $5, $6)", u);
        }

        const followers = [
          ['bob', 'alice'], ['bob', 'charlie'], ['alice', 'bob'], ['charlie', 'alice'], ['charlie', 'diana'], ['diana', 'bob']
        ];
        for (const f of followers) {
          await pgPool.query("INSERT INTO followers (follower, following) VALUES ($1, $2)", f);
        }

        const posts = [
          ['alice', 'post', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'Chasing the beautiful sunset on the shore 🌅'],
          ['bob', 'post', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', 'Excited to test my new camera setup today! 🎥📸'],
          ['charlie', 'post', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', 'Late night sessions in the studio, new track coming soon! 🎵🎹'],
          ['diana', 'post', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800', 'Consistency is key. Push yourself every single day! 💪🔥'],
          ['bob', 'reel', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Fire effects test 🚀 #reels #vfx'],
          ['charlie', 'reel', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'Escape to nature 🌲🍃 #reels #music']
        ];
        for (const p of posts) {
          await pgPool.query("INSERT INTO posts (username, type, media_url, caption) VALUES ($1, $2, $3, $4)", p);
        }

        const likes = [[1, 'bob'], [1, 'charlie'], [2, 'alice'], [3, 'alice']];
        for (const l of likes) {
          await pgPool.query("INSERT INTO likes (post_id, username) VALUES ($1, $2)", l);
        }

        const comments = [
          [1, 'bob', 'Wow, this looks incredible! Where was this taken?'],
          [1, 'charlie', 'Beautiful colors! Absolutely stunning!'],
          [2, 'alice', 'Nice gear setup! Let me know how it performs.'],
          [3, 'alice', 'Can’t wait to hear the new music, Charlie!']
        ];
        for (const c of comments) {
          await pgPool.query("INSERT INTO comments (post_id, username, comment_text) VALUES ($1, $2, $3)", c);
        }

        const messages = [
          ['bob', 'alice', 'Hey Alice, are you free this weekend?', 'chat', 0],
          ['alice', 'bob', 'Yes! Planning a new photoshoot in the hills.', 'chat', 0],
          ['bob', 'alice', 'Awesome, let know if you need any video assist.', 'chat', 0],
          ['bob', 'alice', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'pic', 0],
          ['alice', 'charlie', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'pic', 0]
        ];
        for (const m of messages) {
          await pgPool.query("INSERT INTO messages (sender, receiver, content, type, is_opened) VALUES ($1, $2, $3, $4, $5)", m);
        }

        const stories = [
          ['alice', 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300'],
          ['bob', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300'],
          ['charlie', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300']
        ];
        for (const s of stories) {
          await pgPool.query("INSERT INTO stories (username, media_url) VALUES ($1, $2)", s);
        }

        console.log('PostgreSQL Database successfully seeded!');
      }
    } catch (e) {
      console.error('Error initializing PostgreSQL tables:', e.message);
    }
  } else {
    // SQLite Tables Creation (standard schema logic)
    db.serialize(() => {
      if (process.env.RESET_DB) {
        db.run(`DROP TABLE IF EXISTS users`);
        db.run(`DROP TABLE IF EXISTS followers`);
        db.run(`DROP TABLE IF EXISTS posts`);
        db.run(`DROP TABLE IF EXISTS likes`);
        db.run(`DROP TABLE IF EXISTS comments`);
        db.run(`DROP TABLE IF EXISTS messages`);
        db.run(`DROP TABLE IF EXISTS stories`);
        db.run(`DROP TABLE IF EXISTS saved_posts`);
        db.run(`DROP TABLE IF EXISTS login_sessions`);
        db.run(`DROP TABLE IF EXISTS app_info`);
      }

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          profile_picture TEXT,
          bio TEXT,
          password_hash TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          public_key TEXT,
          wrapped_private_key TEXT,
          admin_wrapped_private_key TEXT,
          is_private INTEGER DEFAULT 0,
          deactivated_at TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS followers (
          follower TEXT NOT NULL,
          following TEXT NOT NULL,
          PRIMARY KEY (follower, following),
          FOREIGN KEY(follower) REFERENCES users(username),
          FOREIGN KEY(following) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          type TEXT NOT NULL,
          media_url TEXT NOT NULL,
          caption TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(username) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS likes (
          post_id INTEGER,
          username TEXT,
          PRIMARY KEY (post_id, username),
          FOREIGN KEY(post_id) REFERENCES posts(id),
          FOREIGN KEY(username) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          comment_text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(post_id) REFERENCES posts(id),
          FOREIGN KEY(username) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender TEXT NOT NULL,
          receiver TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL,
          is_opened INTEGER DEFAULT 0,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(sender) REFERENCES users(username),
          FOREIGN KEY(receiver) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          media_url TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(username) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS saved_posts (
          username TEXT NOT NULL,
          post_id INTEGER NOT NULL,
          PRIMARY KEY (username, post_id),
          FOREIGN KEY(username) REFERENCES users(username),
          FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS login_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(username) REFERENCES users(username)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS app_info (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
        if (!err && (!row || row.count === 0)) {
          console.log('SQLite Database is empty. Seeding...');
          db.serialize(() => {
            db.run(`INSERT INTO app_info (key, value) VALUES ('about', 'Welcome to P.G Chat App - a secure, E2EE social sandbox experience where users can safely share posts, reels, stories, and messages with advanced privacy controls and social features.')`);

            const defaultHash = bcrypt.hashSync('password123', 10);
            const userSeeds = [
              ['alice', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Photographer & Digital Artist 🎨', defaultHash, 'alice@pg.com', '+1234567891'],
              ['bob', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'Traveler & Filmmaker 🎬', defaultHash, 'bob@pg.com', '+1234567892'],
              ['charlie', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', 'Musician & Tech Lover 🎵', defaultHash, 'charlie@pg.com', '+1234567893'],
              ['diana', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'Fitness coach & blogger 💪', defaultHash, 'diana@pg.com', '+1234567894'],
              ['admin', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'System Administrator 👑', defaultHash, 'pg9152766@gmail.com', '+1234567890']
            ];
            const insertUser = db.prepare(`INSERT INTO users (username, profile_picture, bio, password_hash, email, phone) VALUES (?, ?, ?, ?, ?, ?)`);
            userSeeds.forEach(user => insertUser.run(user));
            insertUser.finalize();

            const followerSeeds = [
              ['bob', 'alice'], ['bob', 'charlie'], ['alice', 'bob'], ['charlie', 'alice'], ['charlie', 'diana'], ['diana', 'bob']
            ];
            const insertFollower = db.prepare(`INSERT INTO followers (follower, following) VALUES (?, ?)`);
            followerSeeds.forEach(f => insertFollower.run(f));
            insertFollower.finalize();

            const postSeeds = [
              ['alice', 'post', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'Chasing the beautiful sunset on the shore 🌅'],
              ['bob', 'post', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', 'Excited to test my new camera setup today! 🎥📸'],
              ['charlie', 'post', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', 'Late night sessions in the studio, new track coming soon! 🎵🎹'],
              ['diana', 'post', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800', 'Consistency is key. Push yourself every single day! 💪🔥'],
              ['bob', 'reel', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Fire effects test 🚀 #reels #vfx'],
              ['charlie', 'reel', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'Escape to nature 🌲🍃 #reels #music']
            ];
            const insertPost = db.prepare(`INSERT INTO posts (username, type, media_url, caption) VALUES (?, ?, ?, ?)`);
            postSeeds.forEach(post => insertPost.run(post));
            insertPost.finalize();

            const likeSeeds = [[1, 'bob'], [1, 'charlie'], [2, 'alice'], [3, 'alice']];
            const insertLike = db.prepare(`INSERT INTO likes (post_id, username) VALUES (?, ?)`);
            likeSeeds.forEach(like => insertLike.run(like));
            insertLike.finalize();

            const commentSeeds = [
              [1, 'bob', 'Wow, this looks incredible! Where was this taken?'],
              [1, 'charlie', 'Beautiful colors! Absolutely stunning!'],
              [2, 'alice', 'Nice gear setup! Let me know how it performs.'],
              [3, 'alice', 'Can’t wait to hear the new music, Charlie!']
            ];
            const insertComment = db.prepare(`INSERT INTO comments (post_id, username, comment_text) VALUES (?, ?, ?)`);
            commentSeeds.forEach(comment => insertComment.run(comment));
            insertComment.finalize();

            const messageSeeds = [
              ['bob', 'alice', 'Hey Alice, are you free this weekend?', 'chat', 0],
              ['alice', 'bob', 'Yes! Planning a new photoshoot in the hills.', 'chat', 0],
              ['bob', 'alice', 'Awesome, let know if you need any video assist.', 'chat', 0],
              ['bob', 'alice', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'pic', 0],
              ['alice', 'charlie', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'pic', 0]
            ];
            const insertMessage = db.prepare(`INSERT INTO messages (sender, receiver, content, type, is_opened) VALUES (?, ?, ?, ?, ?)`);
            messageSeeds.forEach(msg => insertMessage.run(msg));
            insertMessage.finalize();

            const storySeeds = [
              ['alice', 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300'],
              ['bob', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300'],
              ['charlie', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300']
            ];
            const insertStory = db.prepare(`INSERT INTO stories (username, media_url) VALUES (?, ?)`);
            storySeeds.forEach(story => insertStory.run(story));
            insertStory.finalize();

            console.log('SQLite Database successfully seeded!');
          });
        }
      });
    });
  }
}

// Call async init function
initDatabase();

// Wrapper query helpers
function queryAll(sql, params = []) {
  if (isPostgres) {
    return pgPool.query(translateSQL(sql), params).then(res => res.rows);
  }
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function queryRun(sql, params = []) {
  if (isPostgres) {
    return pgPool.query(translateSQL(sql), params);
  }
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function queryGet(sql, params = []) {
  if (isPostgres) {
    return pgPool.query(translateSQL(sql), params).then(res => res.rows[0] || null);
  }
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  db,
  pgPool,
  queryAll,
  queryRun,
  queryGet
};
