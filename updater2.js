const fs = require('fs');

// 1. Fix server.js limits (Avatar persistence)
let server = fs.readFileSync('backend/server.js', 'utf8');
server = server.replace('app.use(express.json());', "app.use(express.json({ limit: '50mb' }));\napp.use(express.urlencoded({ limit: '50mb', extended: true }));");

// Add delete story route if missing
if (!server.includes("app.delete('/api/stories/:id'")) {
  server = server.replace(/app\.delete\('\/api\/posts\/:id', async \(req, res\) => \{[\s\S]*?\}\);/, 
    "$&" + "\n\napp.delete('/api/stories/:id', async (req, res) => {\n  const { id } = req.params;\n  try {\n    await db.queryRun(`DELETE FROM stories WHERE id = ?`, [id]);\n    res.json({ success: true });\n  } catch (err) {\n    res.status(500).json({ error: 'Failed to delete story' });\n  }\n});");
}
fs.writeFileSync('backend/server.js', server);


// 2. Fix index.html cache busting for CSS
let html = fs.readFileSync('frontend-web/index.html', 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css?v=2">');
// Add delete post button to lightbox
if(!html.includes('btn-delete-post')) {
    html = html.replace('<button id="btn-save-post"', '<button id="btn-delete-post" class="btn btn-danger hidden">🗑️ Delete</button>\n          <button id="btn-save-post"');
}
fs.writeFileSync('frontend-web/index.html', html);


// 3. Fix app.js
let app = fs.readFileSync('frontend-web/app.js', 'utf8');

// A. Fix refreshActiveTab to respect viewingProfile
if (!app.includes('state.viewingProfile')) {
  app = app.replace("activeTab: 'feed',", "activeTab: 'feed',\n  viewingProfile: null,");
}
app = app.replace("loadProfile(state.currentUser.username);", "loadProfile(state.viewingProfile || state.currentUser.username);");

// Update viewUserProfile to set viewingProfile
app = app.replace("async function viewUserProfile(username) {", "async function viewUserProfile(username) {\n  state.viewingProfile = username;");

// Fix nav item clicking to reset viewingProfile to self when clicking "Profile" tab on sidebar
app = app.replace(/if \(tab === 'profile'\) \{\s*state\.activeTab = 'profile';\s*\}/g, 
  "if (tab === 'profile') { state.viewingProfile = null; state.activeTab = 'profile'; }");

// C. Fix Bio Edit Logic
// Ensure loadProfile sets up the bio edit logic correctly
const bioLogic = `
    const btnEditBio = document.getElementById('btn-edit-bio-toggle');
    const bioEditBox = document.getElementById('bio-edit-box');
    const inputBio = document.getElementById('input-bio');
    const btnSaveBio = document.getElementById('btn-save-bio');
    const btnCancelBio = document.getElementById('btn-cancel-bio');

    if (username === state.currentUser.username) {
      if (btnEditBio) {
        btnEditBio.classList.remove('hidden');
        btnEditBio.onclick = () => {
          bioEditBox.classList.remove('hidden');
          profileBio.classList.add('hidden');
          inputBio.value = profileUser.bio || '';
        };
      }
      if (btnCancelBio) {
        btnCancelBio.onclick = () => {
          bioEditBox.classList.add('hidden');
          profileBio.classList.remove('hidden');
        };
      }
      if (btnSaveBio) {
        btnSaveBio.onclick = async () => {
          const newBio = inputBio.value.trim();
          try {
            const res = await fetch(\`\${API_BASE_URL}/users/update-bio\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: state.currentUser.username, bio: newBio })
            });
            if (res.ok) {
              profileBio.textContent = newBio;
              state.currentUser.bio = newBio;
              bioEditBox.classList.add('hidden');
              profileBio.classList.remove('hidden');
            }
          } catch(e) { console.error(e); }
        };
      }
    }
`;

// Insert the bio logic inside viewUserProfile where we check if it's currentUser
app = app.replace(/if \(username === state\.currentUser\.username\) \{\s*if \(btnEditBio\) btnEditBio\.classList\.remove\('hidden'\);\s*if \(btnFollowToggle\) btnFollowToggle\.classList\.add\('hidden'\);\s*\}/, 
  `if (username === state.currentUser.username) {
      if (btnFollowToggle) btnFollowToggle.classList.add('hidden');
      ${bioLogic}
    }`);

// Also fix it in the original loadProfile
app = app.replace(/profileBio\.textContent = profileUser\.bio;/g, `profileBio.textContent = profileUser.bio || 'No bio yet.';`);

// D. Add Delete functionality
// Global function to delete post
const deletePostLogic = `
window.deletePost = async function(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetch(\`\${API_BASE_URL}/posts/\${id}?username=\${state.currentUser.username}\`, { method: 'DELETE' });
    if (res.ok) {
      alert('Post deleted!');
      document.getElementById('post-lightbox').classList.add('hidden');
      if(state.activeTab === 'profile') loadProfile(state.viewingProfile || state.currentUser.username);
      else loadFeed();
    }
  } catch(e) { console.error(e); }
}
`;
if (!app.includes('window.deletePost')) {
  app = app.replace('// Initialize the sandbox', deletePostLogic + '\n// Initialize the sandbox');
}

// In openLightbox, show delete button if we own the post
const lightboxLogic = `
  const btnDeletePost = document.getElementById('btn-delete-post');
  if (btnDeletePost) {
    if (post.username === state.currentUser.username) {
      btnDeletePost.classList.remove('hidden');
      btnDeletePost.onclick = () => deletePost(post.id);
    } else {
      btnDeletePost.classList.add('hidden');
    }
  }
`;
if(!app.includes("btnDeletePost.classList.remove('hidden');")) {
    app = app.replace("if (isSaved) {", lightboxLogic + "\n    if (isSaved) {");
}


fs.writeFileSync('frontend-web/app.js', app);
console.log('Updater 2 completed successfully!');
