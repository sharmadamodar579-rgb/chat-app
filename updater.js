const fs = require('fs');
const path = require('path');

// 1. Update style.css
let css = fs.readFileSync('frontend-web/style.css', 'utf8');
css += `
/* --- SPIDERMAN THEME UPDATES --- */
body {
  background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url('spiderman-theme.png') no-repeat center center fixed !important;
  background-size: cover !important;
  color: #ffffff !important;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
.glass {
  background: rgba(20, 20, 25, 0.65) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 100, 100, 0.2) !important;
}
.btn-primary {
  background: linear-gradient(135deg, #e23636, #500808) !important;
  border-color: #ff4444 !important;
  color: white !important;
}
h1, h2, h3, h4, h5, .step-title {
  color: #ffcccc !important;
}
.sub-text, .step-sub, .bio-text, .track-artist {
  color: #dddddd !important;
}
`;
fs.writeFileSync('frontend-web/style.css', css);


// 2. Update index.html
let html = fs.readFileSync('frontend-web/index.html', 'utf8');

// Add password toggle buttons
html = html.replace(/<input type="password" id="login-password" placeholder="Enter password...">/g, 
  `<input type="password" id="login-password" placeholder="Enter password...">
   <button type="button" class="btn-toggle-password" onclick="togglePassword('login-password')" style="background:none; border:none; cursor:pointer; color:#aaa; font-size:1.1rem;">👁️</button>`);

html = html.replace(/<input type="password" id="signup-password" placeholder="Choose password...">/g, 
  `<input type="password" id="signup-password" placeholder="Choose password...">
   <button type="button" class="btn-toggle-password" onclick="togglePassword('signup-password')" style="background:none; border:none; cursor:pointer; color:#aaa; font-size:1.1rem;">👁️</button>`);

html = html.replace(/<input type="password" id="reset-new-password" placeholder="New password...">/g, 
  `<input type="password" id="reset-new-password" placeholder="New password...">
   <button type="button" class="btn-toggle-password" onclick="togglePassword('reset-new-password')" style="background:none; border:none; cursor:pointer; color:#aaa; font-size:1.1rem;">👁️</button>`);

// Add global togglePassword function to head
html = html.replace('</head>', `
  <script>
    function togglePassword(id) {
      const el = document.getElementById(id);
      if (el.type === 'password') {
        el.type = 'text';
      } else {
        el.type = 'password';
      }
    }
  </script>
</head>`);

// Update file upload in create post
html = html.replace(/<input type="text" id="post-media-url".*?>/g, 
  `<input type="file" id="post-media-file" accept="image/*,video/*" capture="environment" style="flex: 1; background: rgba(0,0,0,0.3); color: white; border-radius: 8px; padding: 5px;">`);
// Hide the snap button since file input handles it natively on mobile
html = html.replace(/id="btn-camera-snap-post"/g, 'id="btn-camera-snap-post" style="display:none;"');

fs.writeFileSync('frontend-web/index.html', html);


// 3. Update app.js
let appJs = fs.readFileSync('frontend-web/app.js', 'utf8');

// Update OTP Simulated Messages
appJs = appJs.replace(/alert\('Simulated: Verification code sent! Check your app logs.'\);/g, 
  "alert('Verification code sent to your Phone/Email! (Since this is a Sandbox, your code is: 123456)');");
appJs = appJs.replace(/alert\('Simulated: Reset code sent!'\);/g, 
  "alert('Password Reset code sent to your Phone/Email! (Code: 123456)');");

// Make usernames clickable to route to profile
// Instead of complex regex for all renders, we can attach event delegation globally
const clickRouter = `
// Profile Routing Logic
document.addEventListener('click', (e) => {
  // If clicked element or its parent has a 'data-username' attribute
  const userEl = e.target.closest('[data-username]');
  if (userEl && !e.target.closest('button') && !userEl.closest('.profile-header-info')) {
    const username = userEl.getAttribute('data-username');
    if (username) {
      viewUserProfile(username);
    }
  }
});

async function viewUserProfile(username) {
  // Switch to profile tab
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('.nav-item[data-tab="profile"]').classList.add('active');
  state.activeTab = 'profile';
  
  // Hide all panels, show profile panel
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('tab-panel-profile').classList.remove('hidden');

  // Fetch their profile
  const allUsersRes = await fetch(\`\${API_BASE_URL}/users\`);
  const users = await allUsersRes.json();
  const profileUser = users.find(u => u.username === username);
  
  if (profileUser) {
    document.getElementById('profile-username').textContent = '@' + profileUser.username;
    document.getElementById('profile-avatar').src = profileUser.profile_picture;
    document.getElementById('profile-bio').textContent = profileUser.bio || 'No bio yet.';
    
    // Hide edit bio button, maybe show follow button
    const btnEditBio = document.getElementById('btn-edit-bio-toggle');
    const btnFollowToggle = document.getElementById('btn-follow-toggle');
    
    if (username === state.currentUser.username) {
      if (btnEditBio) btnEditBio.classList.remove('hidden');
      if (btnFollowToggle) btnFollowToggle.classList.add('hidden');
    } else {
      if (btnEditBio) btnEditBio.classList.add('hidden');
      if (btnFollowToggle) {
        btnFollowToggle.classList.remove('hidden');
        btnFollowToggle.setAttribute('data-target-user', username);
        // Check if following
        const relRes = await fetch(\`\${API_BASE_URL}/social/relations/\${state.currentUser.username}\`);
        const stats = await relRes.json();
        const following = stats.following || [];
        if (following.includes(username)) {
          btnFollowToggle.textContent = 'Unfollow';
          btnFollowToggle.classList.replace('btn-secondary', 'btn-danger');
        } else {
          btnFollowToggle.textContent = 'Follow';
          btnFollowToggle.classList.replace('btn-danger', 'btn-secondary');
        }
      }
    }
    
    // Load their stats and posts
    const relRes = await fetch(\`\${API_BASE_URL}/social/relations/\${username}\`);
    const stats = await relRes.json();
    document.getElementById('profile-followers-count').textContent = (stats.followers || []).length;
    document.getElementById('profile-following-count').textContent = (stats.following || []).length;

    const feedRes = await fetch(\`\${API_BASE_URL}/posts/feed/\${username}\`);
    const allFeed = await feedRes.json();
    const ownPosts = allFeed.filter(p => p.username === username);
    document.getElementById('profile-posts-count').textContent = ownPosts.length;
    
    const gallery = document.getElementById('profile-gallery');
    gallery.innerHTML = ownPosts.map(p => {
      if (p.type === 'reel') {
        return \`<div class="gallery-item"><video src="\${p.media_url}" autoplay loop muted style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute; top:5px; right:5px;">🎥</span></div>\`;
      }
      return \`<div class="gallery-item"><img src="\${p.media_url}"></div>\`;
    }).join('');
  }
}
`;

appJs = appJs.replace('// Initialize the sandbox', clickRouter + '\n// Initialize the sandbox');

// Replace handleCreatePost to use file upload
const newHandleCreatePost = `
async function handleCreatePost(e) {
  e.preventDefault();
  const type = document.querySelector('input[name="post-type"]:checked').value;
  const fileInput = document.getElementById('post-media-file');
  const captionInput = document.getElementById('post-caption');
  const caption = captionInput ? captionInput.value.trim() : '';

  const file = fileInput && fileInput.files[0];
  let mediaUrl = '';

  if (file) {
    // Convert to base64
    mediaUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  } else {
    // Fallback if they used a template which populated a hidden field or similar, 
    // but we removed URL input. So we must have a file.
    alert('Please select a photo or video to upload.');
    return;
  }

  try {
    let res;
    if (type === 'story') {
      res = await fetch(\`\${API_BASE_URL}/stories/create\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.currentUser.username,
          media_url: mediaUrl
        })
      });
    } else {
      res = await fetch(\`\${API_BASE_URL}/posts/create\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.currentUser.username,
          type: type,
          media_url: mediaUrl,
          caption: caption
        })
      });
    }

    if (res.ok) {
      alert(type + ' published successfully!');
      e.target.reset();
      loadFeed();
      loadStories();
    } else {
      alert('Failed to publish.');
    }
  } catch (err) {
    console.error(err);
  }
}
`;

// Use regex to replace the old handleCreatePost function
appJs = appJs.replace(/async function handleCreatePost\(e\) \{[\s\S]*?(?=async function loadFeed)/, newHandleCreatePost + '\n\n');

// Ensure rendering templates include data-username for routing
appJs = appJs.replace(/<span class="post-username">@\${p\.username}<\/span>/g, '<span class="post-username" data-username="${p.username}" style="cursor:pointer; text-decoration:underline;">@${p.username}</span>');
appJs = appJs.replace(/<h3 style="margin: 0; font-size: 1.1rem;">@\${user\.username}<\/h3>/g, '<h3 style="margin: 0; font-size: 1.1rem;" data-username="${user.username}" style="cursor:pointer; text-decoration:underline;">@${user.username}</h3>');


fs.writeFileSync('frontend-web/app.js', appJs);
console.log('Update script completed.');
