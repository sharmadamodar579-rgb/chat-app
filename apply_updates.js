const fs = require('fs');

function mustReplace(str, pattern, replacement) {
  const res = str.replace(pattern, replacement);
  if (res === str) console.warn("WARNING: Pattern not found: " + pattern);
  return res;
}

// 1. server.js modifications
let server = fs.readFileSync('backend/server.js', 'utf8');

if (!server.includes('Content-Security-Policy')) {
  const csp = `
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; media-src 'self' data: blob: https://res.cloudinary.com; connect-src 'self'");
  next();
});
`;
  server = mustReplace(server, 'app.use(cors());', 'app.use(cors());\n' + csp);
}

if (!server.includes("'/api/users/:username'")) {
  const userRoute = `
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
`;
  server = mustReplace(server, "app.get('/api/users',", userRoute + "\napp.get('/api/users',");
}

if (!server.includes('/api/upload')) {
  const uploadRoute = `
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
`;
  server = mustReplace(server, "app.post('/api/posts/create',", uploadRoute + "\napp.post('/api/posts/create',");
}

// Fix DELETE route
server = server.replace(/app\.delete\('\/api\/posts\/:id'.*?\}\);/s, `
app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const username = req.query.username;
  try {
    const post = await db.queryGet('SELECT username FROM posts WHERE id = ?', [id]);
    if (!post || post.username !== username) return res.status(403).json({ error: 'Forbidden' });
    await db.queryRun('DELETE FROM posts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
`);

fs.writeFileSync('backend/server.js', server);

// 2. index.html modifications
let html = fs.readFileSync('frontend-web/index.html', 'utf8');
if (!html.includes('upload-loading-overlay')) {
  html = html.replace('</body>', `
  <div id="upload-loading-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;flex-direction:column;gap:14px;">
    <div style="width:50px;height:50px;border:4px solid #333;border-top-color:#e23636;border-radius:50%;animation:spin 1s linear infinite;"></div>
    <p style="color:#fff;">Uploading...</p>
  </div>
  <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
</body>`);
}
html = html.replace(/(<a\b[^>]*target="_blank")(?![^>]*\brel=)([^>]*>)/gi, '$1 rel="noopener noreferrer"$2');
fs.writeFileSync('frontend-web/index.html', html);

// 3. app.js modifications
let app = fs.readFileSync('frontend-web/app.js', 'utf8');

if (!app.includes('function apiFetch')) {
  app = app.replace('// Initialize the sandbox', `
async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}
function showUploadOverlay(show) {
  const el = document.getElementById('upload-loading-overlay');
  if(el) el.style.display = show ? 'flex' : 'none';
}
document.addEventListener('click', (() => {
  let cooldown = false;
  return (e) => {
    if(e.target.closest('#btn-follow-toggle')) {
      if(cooldown) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      cooldown = true; setTimeout(() => cooldown = false, 600);
    }
  };
})(), true);
\n// Initialize the sandbox`);
}

app = app.replace(/const allUsersRes = await fetch\(`\$\{API_BASE_URL\}\/users`\);\s*const users = await allUsersRes\.json\(\);\s*const profileUser = users\.find\(u => u\.username === username\);/s, 
  "const profileUser = await apiFetch(`${API_BASE_URL}/users/${username}`).catch(()=>null);");

app = app.replace(/if \(file\) \{\s*mediaUrl = await new Promise.*?\s*\}\s*else/s, `
  if (file) {
    showUploadOverlay(true);
    try {
      const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(file); });
      const up = await apiFetch(\`\${API_BASE_URL}/upload\`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({data: b64}) });
      mediaUrl = up.url;
    } catch(e) { alert('Upload failed'); showUploadOverlay(false); return; }
    showUploadOverlay(false);
  } else
`);

fs.writeFileSync('frontend-web/app.js', app);
console.log('App updates applied successfully.');
