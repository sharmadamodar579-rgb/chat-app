const API_BASE_URL = '/api';

// Sandbox State
let state = {
  users: [],             // Array of all profiles
  currentUser: null,     // Active user object { username, profile_picture, bio }
  activeTab: 'feed',     // Current nav tab: feed, reels, messages, create, profile
  activeChatPartner: null, // User object of the active chat partner
  chatPollInterval: null,  // Interval to poll chat messages
  feedPollInterval: null,  // Interval to poll feed
  profileGalleryFilter: 'post' // Sub-tab filter in profile gallery ('post' = Photos, 'reel' = Videos)
};

// DOM Cache
const identitySwitcher = document.getElementById('identity-switcher');
const activeUserAvatar = document.getElementById('active-user-avatar');
const activeUsername = document.getElementById('active-username');
const sidebarNavItems = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');

// Tab specific containers
const storiesList = document.getElementById('stories-list');
const feedList = document.getElementById('feed-list');
const reelsDeck = document.getElementById('reels-deck');
const threadsList = document.getElementById('threads-list');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send');
const btnCameraPic = document.getElementById('btn-camera-pic');

// Profile DOM elements
const profileAvatar = document.getElementById('profile-avatar');
const profileUsername = document.getElementById('profile-username');
const btnFollowToggle = document.getElementById('btn-follow-toggle');
const profilePostsCount = document.getElementById('profile-posts-count');
const profileFollowersCount = document.getElementById('profile-followers-count');
const profileFollowingCount = document.getElementById('profile-following-count');
const profileBio = document.getElementById('profile-bio');
const profileGallery = document.getElementById('profile-gallery');

// Bio Editing DOM elements
const btnEditBioToggle = document.getElementById('btn-edit-bio-toggle');
const bioEditBox = document.getElementById('bio-edit-box');
const inputBio = document.getElementById('input-bio');
const btnSaveBio = document.getElementById('btn-save-bio');
const btnCancelBio = document.getElementById('btn-cancel-bio');
const profileTabBtns = document.querySelectorAll('.profile-tab-btn');

// Overlays
const picOverlay = document.getElementById('pic-overlay');
const picSenderLabel = document.getElementById('pic-sender-label');
const picTimer = document.getElementById('pic-timer');
const picImageView = document.getElementById('pic-image-view');

const storyOverlay = document.getElementById('story-overlay');
const storyOwnerLabel = document.getElementById('story-owner-label');
const storyImageView = document.getElementById('story-image-view');
const btnCloseStory = document.getElementById('btn-close-story');

const picPicker = document.getElementById('pic-picker');
const btnCancelPicker = document.getElementById('btn-cancel-picker');

// Template Quick Selections
const btnTemplates = document.querySelectorAll('.btn-template');
const createPostForm = document.getElementById('create-post-form');
const postMediaUrlInput = document.getElementById('post-media-url');
const postCaptionInput = document.getElementById('post-caption');
const captionGroup = document.getElementById('caption-group');

// Premium Web Draw & Visualizer Caches
const btnWebDraw = document.getElementById('btn-web-draw');
const webDrawModal = document.getElementById('web-draw-modal');
const btnCloseDrawModal = document.getElementById('btn-close-draw-modal');
const btnCancelDraw = document.getElementById('btn-cancel-draw');
const btnSendDraw = document.getElementById('btn-send-draw');
const btnClearDraw = document.getElementById('btn-clear-draw');
const drawCanvas = document.getElementById('draw-canvas');
const drawSizeSelect = document.getElementById('draw-size-select');
const reelsFilterSelect = document.getElementById('reels-filter-select');
const cameraFilterSelect = document.getElementById('camera-filter-select');

// Initialize the sandbox
async function init() {
  try {
    // 1. Get all seed users
    const response = await fetch(`${API_BASE_URL}/users`);
    state.users = await response.json();

    // 2. Populate user switcher
    identitySwitcher.innerHTML = '';
    state.users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.username;
      option.textContent = `@${user.username} (${user.bio.substring(0, 15)}...)`;
      identitySwitcher.appendChild(option);
    });

    // Enforce initial login screen state
    document.body.className = 'not-logged-in';
    state.currentUser = null;

    // 3. Attach identity switcher listener
    identitySwitcher.addEventListener('change', async (e) => {
      await setCurrentUser(e.target.value);
    });

    // --- Redesigned Landing & Auth Elements ---
    const stepLanding = document.getElementById('step-landing');
    const stepLogin = document.getElementById('step-login');
    const stepSignupContact = document.getElementById('step-signup-contact');
    const stepSignupOtp = document.getElementById('step-signup-otp');
    const stepSignupCreds = document.getElementById('step-signup-creds');
    const stepForgot = document.getElementById('step-forgot');

    const btnGotoLogin = document.getElementById('btn-goto-login');
    const btnGotoSignup = document.getElementById('btn-goto-signup');
    const btnBackToLandingLogin = document.getElementById('btn-back-to-landing-login');
    const btnBackToLandingSignup = document.getElementById('btn-back-to-landing-signup');
    const btnBackToSignupContact = document.getElementById('btn-back-to-signup-contact');
    const btnCancelReset = document.getElementById('btn-cancel-reset');

    const loginCredentialInput = document.getElementById('login-credential');
    const loginPasswordInput = document.getElementById('login-password');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const btnForgotLink = document.getElementById('btn-forgot-password-link');

    const signupTabEmail = document.getElementById('signup-tab-email');
    const signupTabPhone = document.getElementById('signup-tab-phone');
    const signupEmailContainer = document.getElementById('signup-email-container');
    const signupPhoneContainer = document.getElementById('signup-phone-container');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPhoneInput = document.getElementById('signup-phone');
    const btnSignupSendCode = document.getElementById('btn-signup-send-code');

    const signupOtpCodeInput = document.getElementById('signup-otp-code');
    const btnSignupVerifyCode = document.getElementById('btn-signup-verify-code');

    const signupUsernameInput = document.getElementById('signup-username');
    const signupPasswordInput = document.getElementById('signup-password');
    const btnSignupSubmit = document.getElementById('btn-signup-submit');

    const resetCodeInput = document.getElementById('reset-code');
    const resetNewPasswordInput = document.getElementById('reset-new-password');
    const btnResetSubmit = document.getElementById('btn-reset-password-submit');

    const btnSidebarLogout = document.getElementById('btn-sidebar-logout');

    let activeSignupContactType = 'email'; // email or phone
    let verifiedSignupContact = '';

    // Landing navigation
    btnGotoLogin.addEventListener('click', () => {
      stepLanding.classList.add('hidden');
      stepLogin.classList.remove('hidden');
    });

    btnGotoSignup.addEventListener('click', () => {
      stepLanding.classList.add('hidden');
      stepSignupContact.classList.remove('hidden');
    });

    btnBackToLandingLogin.addEventListener('click', () => {
      stepLogin.classList.add('hidden');
      stepLanding.classList.remove('hidden');
    });

    btnBackToLandingSignup.addEventListener('click', () => {
      stepSignupContact.classList.add('hidden');
      stepLanding.classList.remove('hidden');
    });

    btnBackToSignupContact.addEventListener('click', () => {
      stepSignupOtp.classList.add('hidden');
      stepSignupContact.classList.remove('hidden');
    });

    btnCancelReset.addEventListener('click', () => {
      stepForgot.classList.add('hidden');
      stepLogin.classList.remove('hidden');
    });

    // Tab Switches in Signup
    signupTabEmail.addEventListener('click', () => {
      signupTabEmail.classList.add('active');
      signupTabPhone.classList.remove('active');
      signupEmailContainer.classList.remove('hidden');
      signupPhoneContainer.classList.add('hidden');
      activeSignupContactType = 'email';
    });

    signupTabPhone.addEventListener('click', () => {
      signupTabPhone.classList.add('active');
      signupTabEmail.classList.remove('active');
      signupPhoneContainer.classList.remove('hidden');
      signupEmailContainer.classList.add('hidden');
      activeSignupContactType = 'phone';
    });

    // Send code for Signup verification
    btnSignupSendCode.addEventListener('click', async () => {
      const contactVal = activeSignupContactType === 'email' ? signupEmailInput.value.trim() : signupPhoneInput.value.trim();
      if (!contactVal) {
        alert(`Please enter your ${activeSignupContactType} first.`);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/signup/send-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: contactVal })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert(`Verification code sent to ${contactVal}!\n(Simulated OTP printed in server logs: ${data.code})`);
          verifiedSignupContact = contactVal;
          stepSignupContact.classList.add('hidden');
          stepSignupOtp.classList.remove('hidden');
        } else {
          alert(data.error || 'Failed to send verification code.');
        }
      } catch (err) {
        console.error(err);
        alert('Error sending verification code.');
      }
    });

    // Verify code for Signup
    btnSignupVerifyCode.addEventListener('click', async () => {
      const code = signupOtpCodeInput.value.trim();
      if (!code) {
        alert('Please enter the 6-digit code.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/signup/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: verifiedSignupContact, code: code })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Contact verified successfully! Please choose your credentials next.');
          stepSignupOtp.classList.add('hidden');
          stepSignupCreds.classList.remove('hidden');
        } else {
          alert(data.error || 'Invalid verification code.');
        }
      } catch (err) {
        console.error(err);
        alert('Error verifying code.');
      }
    });

    // Submit Sign Up Form
    btnSignupSubmit.addEventListener('click', async () => {
      const username = signupUsernameInput.value.trim();
      const password = signupPasswordInput.value;

      if (!username || !password) {
        alert('Username and password are required.');
        return;
      }

      // Check admin restriction rule
      if (username.toLowerCase() === 'admin') {
        if (verifiedSignupContact !== 'pg9152766@gmail.com') {
          alert("The username 'admin' is reserved and can only be registered with the authorized admin email.");
          return;
        }
      }

      try {
        // Derive E2EE credentials client-side!
        const masterKeyBytes = await deriveMasterKey(password, username);
        const keyPair = await generateECDHKeyPair();
        const pubBase64 = await exportECDHPublicKey(keyPair.publicKey);
        const wrappedPriv = await wrapPrivateKey(keyPair.privateKey, masterKeyBytes);

        // Derive admin escrow master key
        const adminMasterKeyBytes = await deriveAdminMasterKey();
        const adminWrappedPriv = await wrapPrivateKey(keyPair.privateKey, adminMasterKeyBytes);

        const isPrivateVal = document.querySelector('input[name="signup-privacy"]:checked').value === 'private';

        const res = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: activeSignupContactType === 'email' ? verifiedSignupContact : null,
            phone: activeSignupContactType === 'phone' ? verifiedSignupContact : null,
            username: username,
            password: password,
            public_key: pubBase64,
            wrapped_private_key: wrappedPriv,
            admin_wrapped_private_key: adminWrappedPriv,
            is_private: isPrivateVal
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          alert('Account created successfully!');
          document.body.className = 'logged-in';
          
          // Re-populate state users list
          const userListRes = await fetch(`${API_BASE_URL}/users`);
          state.users = await userListRes.json();

          await setCurrentUser(username, password);
        } else {
          alert(data.error || 'Sign up failed.');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred during account creation.');
      }
    });

    // Submitting Login
    btnLoginSubmit.addEventListener('click', async () => {
      const username = loginCredentialInput.value.trim();
      const password = loginPasswordInput.value;

      if (!username || !password) {
        alert('Credential and password are required.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: username, password: password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.reactivated) {
            alert('Welcome back! Your account has been reactivated.');
          }
          document.body.className = 'logged-in';
          
          const userListRes = await fetch(`${API_BASE_URL}/users`);
          state.users = await userListRes.json();

          await setCurrentUser(data.user.username, password);
        } else {
          alert(data.error || 'Login failed.');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred during login.');
      }
    });

    // Forgot Password link click
    btnForgotLink.addEventListener('click', async () => {
      const credentialVal = loginCredentialInput.value.trim();
      if (!credentialVal) {
        alert('Please enter your email or phone number in the login field first.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/forgot-password/send-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: credentialVal })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert(`Simulated OTP reset code sent!\n(Console log contains code: ${data.code})`);
          stepLogin.classList.add('hidden');
          stepForgot.classList.remove('hidden');
        } else {
          alert(data.error || 'Failed to send reset code.');
        }
      } catch (err) {
        console.error(err);
        alert('Error sending reset code.');
      }
    });

    // Reset Password code submit
    btnResetSubmit.addEventListener('click', async () => {
      const credentialVal = loginCredentialInput.value.trim();
      const code = resetCodeInput.value.trim();
      const newPassword = resetNewPasswordInput.value;

      if (!code || !newPassword) {
        alert('Reset code and new password are required.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: credentialVal, code: code, newPassword: newPassword })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Password successfully reset! You can now log in.');
          stepForgot.classList.add('hidden');
          stepLogin.classList.remove('hidden');
          loginPasswordInput.value = '';
          resetCodeInput.value = '';
          resetNewPasswordInput.value = '';
        } else {
          alert(data.error || 'Password reset failed.');
        }
      } catch (err) {
        console.error(err);
        alert('Error resetting password.');
      }
    });

    // Log Out button
    btnSidebarLogout.addEventListener('click', () => {
      document.body.className = 'not-logged-in';
      state.currentUser = null;
      state.currentUserPrivateKey = null;

      // Reset values
      loginCredentialInput.value = '';
      loginPasswordInput.value = '';
      signupEmailInput.value = '';
      signupPhoneInput.value = '';
      signupUsernameInput.value = '';
      signupPasswordInput.value = '';
      signupOtpCodeInput.value = '';

      stepForgot.classList.add('hidden');
      stepLogin.classList.add('hidden');
      stepSignupContact.classList.add('hidden');
      stepSignupOtp.classList.add('hidden');
      stepSignupCreds.classList.add('hidden');
      stepLanding.classList.remove('hidden');
      
      console.log('Logged out successfully.');
    });

    // --- Dynamic Themes, Calls & Admin Dev UI ---
    // Persistent theme loader
    const savedTheme = localStorage.getItem('pg-theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
    }

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        document.body.classList.toggle('theme-light');
        const theme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        localStorage.setItem('pg-theme', theme);
      });
    }

    // Chat Theme event handler
    const chatThemeSelect = document.getElementById('chat-theme-select');
    if (chatThemeSelect) {
      chatThemeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        chatMessages.className = 'chat-messages';
        if (theme !== 'classic') {
          chatMessages.classList.add(`chat-theme-${theme}`);
        }
        if (state.activeChatPartner) {
          localStorage.setItem(`pg-chat-theme-${state.activeChatPartner.username}`, theme);
        }
      });
    }

    // Call Buttons
    document.getElementById('btn-voice-call').addEventListener('click', () => {
      startSimulatedCall(false);
    });

    document.getElementById('btn-video-call').addEventListener('click', () => {
      startSimulatedCall(true);
    });

    document.getElementById('btn-end-call').addEventListener('click', () => {
      endActiveCall();
    });

    // Developer DB downloads
    document.getElementById('btn-download-pg-db').addEventListener('click', () => {
      window.open('/api/admin/download/pg.db', '_blank');
    });

    document.getElementById('btn-download-vault-db').addEventListener('click', () => {
      window.open('/api/admin/download/vault.db', '_blank');
    });

    // Avatar systems click upload hooks
    setupAvatarUpload();

    // 4. Attach Sidebar navigation listener
    sidebarNavItems.forEach(item => {
      if (item.id === 'btn-sidebar-logout') return;
      item.addEventListener('click', () => {
        switchTab(item.getAttribute('data-tab'));
      });
    });

    // 5. Setup Create Templates
    btnTemplates.forEach(btn => {
      btn.addEventListener('click', () => {
        postMediaUrlInput.value = btn.getAttribute('data-url');
        const typeVal = btn.getAttribute('data-type');
        document.querySelector(`input[name="post-type"][value="${typeVal}"]`).checked = true;
        toggleCaptionField();
      });
    });

    document.querySelectorAll('input[name="post-type"]').forEach(radio => {
      radio.addEventListener('change', toggleCaptionField);
    });

    createPostForm.addEventListener('submit', handleCreatePost);

    // 6. DM Send Handling
    chatForm.addEventListener('submit', handleSendMessage);
    btnCameraPic.addEventListener('click', () => picPicker.classList.remove('hidden'));
    btnCancelPicker.addEventListener('click', () => picPicker.classList.add('hidden'));

    // Attach Pic option choices
    document.querySelectorAll('.pic-option').forEach(option => {
      option.addEventListener('click', () => {
        const url = option.getAttribute('data-url');
        sendPic(url);
        picPicker.classList.add('hidden');
      });
    });

    // Story closing
    btnCloseStory.addEventListener('click', closeStoryView);
    storyOverlay.addEventListener('click', (e) => {
      if (e.target === storyOverlay || e.target.classList.contains('pic-content-wrapper')) {
        closeStoryView();
      }
    });

    // 7. Profile Bio Editor & Tab Listeners
    btnEditBioToggle.addEventListener('click', () => {
      const bioText = document.getElementById('profile-bio');
      bioText.classList.add('hidden');
      btnEditBioToggle.classList.add('hidden');
      bioEditBox.classList.remove('hidden');
      inputBio.value = bioText.textContent;
    });

    btnCancelBio.addEventListener('click', () => {
      bioEditBox.classList.add('hidden');
      document.getElementById('profile-bio').classList.remove('hidden');
      btnEditBioToggle.classList.remove('hidden');
    });

    btnSaveBio.addEventListener('click', async () => {
      const newBio = inputBio.value.trim();
      try {
        const response = await fetch(`${API_BASE_URL}/users/update-bio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: state.currentUser.username, bio: newBio })
        });
        if (response.ok) {
          const data = await response.json();
          // Update bio in local state
          state.currentUser.bio = data.bio;
          const matchedUser = state.users.find(u => u.username === state.currentUser.username);
          if (matchedUser) {
            matchedUser.bio = data.bio;
          }
          // Reload profile owner's details
          bioEditBox.classList.add('hidden');
          document.getElementById('profile-bio').textContent = data.bio;
          document.getElementById('profile-bio').classList.remove('hidden');
          btnEditBioToggle.classList.remove('hidden');
        }
      } catch (err) {
        console.error(err);
      }
    });

    profileTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        profileTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.profileGalleryFilter = btn.getAttribute('data-tab-filter');
        const displayedUser = profileUsername.textContent.replace('@', '');
        loadProfile(displayedUser);
      });
    });
    // Initial Tab trigger
    switchTab('feed');

    // Poll for chats & feed updates every 3 seconds
    state.chatPollInterval = setInterval(pollActiveChat, 3000);
    state.feedPollInterval = setInterval(pollHomeFeed, 5000);

    // Initializations for custom interactive modules
    setupUserSearch();
    setupChatSettings();
    setupCameraCapture();
    setupVoiceRecorder();
    setupMusicShare();
    setupGlobalUnreadPoller();

    // Settings, Lightbox, Share, and About configurations
    setupAccountSettings();
    setupAppAbout();
    setupLightboxModal();
    setupDirectShare();
    setupGlobalUIChimes();
    setupPremiumWebDraw();
    setupPremiumVisualizer();
    setupPremiumFilters();

  } catch (err) {
    console.error('Initialization error:', err);
  }
}

function toggleCaptionField() {
  const selectedType = document.querySelector('input[name="post-type"]:checked').value;
  if (selectedType === 'story') {
    captionGroup.classList.add('hidden');
  } else {
    captionGroup.classList.remove('hidden');
  }
}

// Switch active sandbox session identity
async function setCurrentUser(username, password = 'password123') {
  const user = state.users.find(u => u.username === username);
  if (!user) return;
  
  state.currentUser = user;
  
  // Update select value
  identitySwitcher.value = username;
  
  // Update UI headers
  activeUserAvatar.src = user.profile_picture;
  activeUsername.textContent = `@${user.username}`;
  
  // Only show user switcher to admin
  const switcherContainer = document.querySelector('.switcher-container');
  if (switcherContainer) {
    if (username === 'admin') {
      switcherContainer.style.display = 'flex';
    } else {
      switcherContainer.style.display = 'none';
    }
  }

  // Show/Hide Developer Tab based on Admin identity
  const devNavItem = document.getElementById('nav-item-developer');
  if (devNavItem) {
    if (username === 'admin') {
      devNavItem.style.display = 'block';
    } else {
      devNavItem.style.display = 'none';
    }
  }

  console.log(`Identity switched to: @${username}`);

  // E2EE key loading/generation
  await loadOrRegisterUserKeys(user, password);
  
  // Refresh current view
  refreshActiveTab();
  updateSelfPresence('Online');
}

/**
 * Loads the user's private key into memory, generating E2EE keys on the fly if missing.
 */
async function loadOrRegisterUserKeys(user, password = 'password123') {
  try {
    // 1. Derive deterministic master key from password and username as salt
    const masterKeyBytes = await deriveMasterKey(password, user.username);

    // 2. Fetch latest profile details from server to be sure we have keys
    const res = await fetch(`${API_BASE_URL}/users`);
    const users = await res.json();
    state.users = users;
    const latestUser = state.users.find(u => u.username === user.username);

    if (latestUser && latestUser.public_key && latestUser.wrapped_private_key) {
      // Keys exist! Decrypt and load private key.
      console.log(`Loading existing E2EE keys for @${user.username}...`);
      state.currentUserPrivateKey = await unwrapPrivateKey(latestUser.wrapped_private_key, masterKeyBytes);
    } else {
      // Keys missing! Generate ECDH key pair on the fly.
      console.log(`E2EE keys missing for @${user.username}. Generating new key pair...`);
      const keyPair = await generateECDHKeyPair();
      
      const pubBase64 = await exportECDHPublicKey(keyPair.publicKey);
      const wrappedPriv = await wrapPrivateKey(keyPair.privateKey, masterKeyBytes);

      // ADMIN KEY ESCROW:
      // Derive the admin's master key
      const adminMasterKeyBytes = await deriveAdminMasterKey();
      // Wrap the private key using the admin master key
      const adminWrappedPriv = await wrapPrivateKey(keyPair.privateKey, adminMasterKeyBytes);

      // Register keys on the server
      const registerRes = await fetch(`${API_BASE_URL}/users/register-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          public_key: pubBase64,
          wrapped_private_key: wrappedPriv,
          admin_wrapped_private_key: adminWrappedPriv
        })
      });

      if (registerRes.ok) {
        console.log(`Successfully registered new E2EE keys for @${user.username} on the server.`);
        // Update in-memory user objects
        user.public_key = pubBase64;
        user.wrapped_private_key = wrappedPriv;
        user.admin_wrapped_private_key = adminWrappedPriv;
        if (latestUser) {
          latestUser.public_key = pubBase64;
          latestUser.wrapped_private_key = wrappedPriv;
          latestUser.admin_wrapped_private_key = adminWrappedPriv;
        }
        state.currentUserPrivateKey = keyPair.privateKey;
      } else {
        console.error('Failed to register E2EE keys on the server.');
      }
    }
  } catch (err) {
    console.error(`E2EE key generation/loading error for @${user.username}:`, err);
  }
}

// Navigation Tab Router
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update nav buttons
  sidebarNavItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update panels display
  tabPanels.forEach(panel => {
    if (panel.id === `tab-panel-${tabId}`) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  // Clean chat states if leaving messages
  if (tabId !== 'messages') {
    state.activeChatPartner = null;
  }

  refreshActiveTab();
}

function refreshActiveTab() {
  switch (state.activeTab) {
    case 'feed':
      loadStories();
      loadFeed();
      break;
    case 'reels':
      loadReels();
      break;
    case 'messages':
      loadChatThreads();
      break;
    case 'create':
      resetCreateForm();
      break;
    case 'profile':
      loadProfile(state.currentUser.username);
      break;
    case 'developer':
      loadDeveloperLogs();
      break;
    case 'settings':
      loadSettingsPanel();
      break;
    case 'about':
      loadAppAboutInfo();
      break;
    case 'search':
      const searchInput = document.getElementById('search-users-input');
      if (searchInput) searchInput.value = '';
      const resultsContainer = document.getElementById('search-results');
      if (resultsContainer) resultsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px 0;">Start typing a username to search...</div>';
      loadSuggestions();
      break;
  }
}

// 1. Stories Loader
async function loadStories() {
  try {
    const res = await fetch(`${API_BASE_URL}/stories/active`);
    const stories = await res.json();
    
    storiesList.innerHTML = '';
    
    // Always add "Your Story" circle first
    const ownStory = document.createElement('div');
    ownStory.className = 'story-item';
    ownStory.title = 'Add to Your Story';
    ownStory.innerHTML = `
      <div class="story-avatar-wrapper own-story">
        <img src="${state.currentUser.profile_picture}" alt="You">
      </div>
    `;
    ownStory.addEventListener('click', () => {
      // Trigger create story
      switchTab('create');
      document.querySelector('input[name="post-type"][value="story"]').checked = true;
      toggleCaptionField();
    });
    storiesList.appendChild(ownStory);

    stories.forEach(story => {
      const item = document.createElement('div');
      item.className = 'story-item';
      item.title = `@${story.username}'s Story`;
      item.innerHTML = `
        <div class="story-avatar-wrapper">
          <img src="${story.profile_picture}" alt="${story.username}">
        </div>
      `;
      item.addEventListener('click', () => viewStory(story));
      storiesList.appendChild(item);
    });
  } catch (e) {
    console.error('Failed to load stories:', e);
  }
}

let activeStoryTimeout = null;

function viewStory(story) {
  if (activeStoryTimeout) {
    clearTimeout(activeStoryTimeout);
  }
  
  const fill = document.getElementById('story-progress-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  
  // Force browser reflow
  fill.offsetWidth;
  
  fill.style.transition = 'width 5000ms linear';
  fill.style.width = '100%';
  
  storyOwnerLabel.textContent = `@${story.username}'s Story`;
  storyImageView.src = story.media_url;
  storyOverlay.classList.remove('hidden');
  
  activeStoryTimeout = setTimeout(closeStoryView, 5000);
}

function closeStoryView() {
  if (activeStoryTimeout) {
    clearTimeout(activeStoryTimeout);
    activeStoryTimeout = null;
  }
  storyOverlay.classList.add('hidden');
  storyImageView.src = '';
}

// 2. Feed Loader
async function loadFeed() {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
    const posts = await res.json();
    
    feedList.innerHTML = '';
    
    if (posts.length === 0) {
      feedList.innerHTML = `
        <div class="card glass text-center" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <h3>No Posts in Feed</h3>
          <p class="sub-text">Go to the profile or switcher, follow some users, or create a new post to populate the feed!</p>
        </div>
      `;
      return;
    }

    posts.forEach(post => {
      // Skip reels on the Home Feed to align with layout
      if (post.type === 'reel') return;

      const card = document.createElement('article');
      card.className = 'feed-post';
      
      const commentsHtml = post.comments.map(c => `
        <div class="comment-row">
          <strong>@${c.username}</strong> <span>${c.comment_text}</span>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="post-header">
          <div class="post-user" data-user="${post.username}">
            <img src="${post.profile_picture}" alt="${post.username}">
            <h4>@${post.username}</h4>
          </div>
          <span class="post-time">${new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        
        <div class="post-media" style="position: relative; cursor: pointer;">
          <img src="${post.media_url}" alt="Post Content" loading="lazy">
          <div class="web-splash-overlay hidden">🕸️</div>
        </div>
        
        <div class="post-actions" style="display: flex; gap: 10px;">
          <button class="btn-like ${post.user_liked ? 'liked' : ''}" data-id="${post.id}">
            ${post.user_liked ? '❤️' : '🤍'}
          </button>
          <button class="btn-comment-focus" style="background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">💬</button>
          <button class="btn-share" data-id="${post.id}" title="Share Post">🔗</button>
        </div>
        
        <div class="post-info">
          <div class="likes-label">${post.likes_count} likes</div>
          <div class="caption-label">
            <span>@${post.username}</span>
            <p>${post.caption}</p>
          </div>
          
          <div class="comments-list-section">
            ${commentsHtml}
          </div>
        </div>
        
        <form class="comment-form" data-id="${post.id}">
          <input type="text" placeholder="Add a comment..." required>
          <button type="submit">Post</button>
        </form>
      `;

      // Event: Share Post (opens Direct Share modal)
      card.querySelector('.btn-share').addEventListener('click', () => {
        openDirectShareModal('post', post.id);
      });

      // Event: Navigate to author profile
      card.querySelector('.post-user').addEventListener('click', () => {
        loadProfile(post.username);
        switchTab('profile');
      });

      // Event: Click on post opens lightbox
      const mediaContainer = card.querySelector('.post-media');
      mediaContainer.addEventListener('click', (e) => {
        if (e.detail === 1) {
          setTimeout(() => {
            if (mediaContainer.dataset.dblClicked === 'true') {
              mediaContainer.dataset.dblClicked = 'false';
              return;
            }
            openPostLightbox(post);
          }, 200);
        }
      });

      mediaContainer.addEventListener('dblclick', async () => {
        mediaContainer.dataset.dblClicked = 'true';
        playWebLikeAnimation(mediaContainer);
        await togglePostLike(post.id, true);
        loadFeed();
      });

      // Event: Toggle Like
      card.querySelector('.btn-like').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const postId = btn.getAttribute('data-id');
        try {
          const lRes = await fetch(`${API_BASE_URL}/posts/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, username: state.currentUser.username })
          });
          const lData = await lRes.json();
          // Reload feed to fetch updated counters
          loadFeed();
        } catch (err) {
          console.error(err);
        }
      });

      // Event: Add Comment
      card.querySelector('.comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const postId = form.getAttribute('data-id');
        const input = form.querySelector('input');
        const commentText = input.value.trim();
        if (!commentText) return;

        try {
          const cRes = await fetch(`${API_BASE_URL}/posts/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              post_id: postId,
              username: state.currentUser.username,
              comment_text: commentText
            })
          });
          if (cRes.ok) {
            input.value = '';
            loadFeed();
          }
        } catch (err) {
          console.error(err);
        }
      });

      feedList.appendChild(card);
    });
  } catch (e) {
    console.error('Failed to load feed:', e);
  }
}

// Polling updates for feed
function pollHomeFeed() {
  if (state.activeTab === 'feed') {
    // Light refresh
    loadFeed();
  }
}

// 3. Reels Loader
async function loadReels() {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/reels`);
    const reels = await res.json();
    
    reelsDeck.innerHTML = '';
    
    if (reels.length === 0) {
      reelsDeck.innerHTML = `
        <div class="card glass" style="margin: auto; padding: 30px; text-align: center;">
          <h3>No Reels Available</h3>
          <p class="sub-text">Go to the Create tab to publish a short video reel!</p>
        </div>
      `;
      return;
    }

    reels.forEach(reel => {
      const card = document.createElement('div');
      card.className = 'reel-card';
      card.innerHTML = `
        <video src="${reel.media_url}" autoplay loop muted playsinline></video>
        
        <div class="reel-overlay">
          <div class="reel-details">
            <div class="reel-user-row" style="cursor: pointer;">
              <img src="${reel.profile_picture}" alt="${reel.username}">
              <h4>@${reel.username}</h4>
            </div>
            <p class="reel-caption">${reel.caption}</p>
          </div>
          
          <div class="reel-actions-column">
            <button class="reel-action-btn btn-like-reel" data-id="${reel.id}">
              <span>❤️</span>
              <label>${reel.likes_count}</label>
            </button>
            <div class="reel-action-btn btn-comment-reel" style="cursor: pointer;">
              <span>💬</span>
              <label>${reel.comments.length}</label>
            </div>
          </div>
        </div>
      `;

      // Like handle on Reels
      card.querySelector('.btn-like-reel').addEventListener('click', async (e) => {
        const postId = e.currentTarget.getAttribute('data-id');
        await fetch(`${API_BASE_URL}/posts/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId, username: state.currentUser.username })
        });
        loadReels();
      });

      card.querySelector('.reel-user-row').addEventListener('click', (e) => {
        e.stopPropagation();
        loadProfile(reel.username);
        switchTab('profile');
      });

      card.querySelector('.btn-comment-reel').addEventListener('click', (e) => {
        e.stopPropagation();
        openPostLightbox(reel);
      });

      // Play/Pause on click
      const video = card.querySelector('video');
      card.addEventListener('click', (e) => {
        // Only click if it's not the actions buttons
        if (e.target.closest('.reel-actions-column') || e.target.closest('.reel-details')) return;
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });

      reelsDeck.appendChild(card);
    });
  } catch (e) {
    console.error('Failed to load reels:', e);
  }
}

// 4. DM Threads Loader
async function loadChatThreads() {
  try {
    threadsList.innerHTML = '';
    
    // List all users except active user, filtering out hidden conversations unless it is active
    const me = state.currentUser.username;
    const partners = state.users.filter(u => {
      if (u.username === me) return false;
      const isHidden = localStorage.getItem(`pg-hidden-${me}-${u.username}`) === 'true';
      if (isHidden && (!state.activeChatPartner || state.activeChatPartner.username !== u.username)) {
        return false;
      }
      return true;
    });
    
    partners.forEach(partner => {
      const thread = document.createElement('div');
      thread.className = 'thread-item';
      if (state.activeChatPartner && state.activeChatPartner.username === partner.username) {
        thread.classList.add('active');
      }
      
      const isMuted = localStorage.getItem(`pg-muted-${me}-${partner.username}`) === 'true';

      thread.innerHTML = `
        <img src="${partner.profile_picture}" alt="${partner.username}">
        <div style="flex: 1;">
          <div class="thread-name" style="display:flex; align-items:center; justify-content:space-between;">
            <span>@${partner.username}</span>
            ${isMuted ? '<span class="thread-muted-icon">🔕</span>' : ''}
          </div>
          <div class="thread-preview" id="preview-${partner.username}">Tap to message...</div>
        </div>
      `;

      thread.addEventListener('click', () => {
        // Remove active from all
        document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('active'));
        thread.classList.add('active');
        selectChatPartner(partner);
      });

      threadsList.appendChild(thread);
      
      // Update thread preview content
      updateThreadPreview(partner.username);
    });
    
    // Clear chat viewport if no partner
    if (!state.activeChatPartner) {
      chatMessages.innerHTML = '<div class="no-chat-selected">Select a chat from the sidebar to view thread history.</div>';
      chatInput.disabled = true;
      chatSendBtn.disabled = true;
      const themeSelect = document.getElementById('chat-theme-select');
      const voiceBtn = document.getElementById('btn-voice-call');
      const videoBtn = document.getElementById('btn-video-call');
      if (themeSelect) themeSelect.classList.add('hidden');
      if (voiceBtn) voiceBtn.classList.add('hidden');
      if (videoBtn) videoBtn.classList.add('hidden');
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Helper to decrypt message content if it is E2EE JSON, otherwise returns plaintext as fallback.
 * If the current user is 'admin', decrypts escrowed private keys to read conversation.
 */
async function decryptMessageContent(msg, partnerName) {
  try {
    const payload = JSON.parse(msg.content);
    if (payload && payload.ciphertext && payload.iv && payload.tag) {
      
      // Admin backdoor bypass check
      if (state.currentUser && state.currentUser.username === 'admin') {
        try {
          const adminMasterKeyBytes = await deriveAdminMasterKey();
          
          const senderUser = state.users.find(u => u.username === msg.sender);
          const receiverUser = state.users.find(u => u.username === msg.receiver);
          
          if (!senderUser || !receiverUser) {
            return "[Decryption Failed: Users not found]";
          }
          
          // Try decrypting with sender's escrowed private key
          if (senderUser.admin_wrapped_private_key && receiverUser.public_key) {
            const senderPrivKey = await unwrapPrivateKey(senderUser.admin_wrapped_private_key, adminMasterKeyBytes);
            const receiverPubKey = await importECDHPublicKey(receiverUser.public_key);
            const sharedKey = await deriveSharedKey(senderPrivKey, receiverPubKey);
            return await decryptData(payload.ciphertext, payload.iv, payload.tag, sharedKey);
          }
          
          // Fallback: try with receiver's escrowed private key
          if (receiverUser.admin_wrapped_private_key && senderUser.public_key) {
            const receiverPrivKey = await unwrapPrivateKey(receiverUser.admin_wrapped_private_key, adminMasterKeyBytes);
            const senderPubKey = await importECDHPublicKey(senderUser.public_key);
            const sharedKey = await deriveSharedKey(receiverPrivKey, senderPubKey);
            return await decryptData(payload.ciphertext, payload.iv, payload.tag, sharedKey);
          }
          
          return "[Decryption Failed: Keys not escrowed]";
        } catch (adminErr) {
          console.error("Admin bypass decryption error:", adminErr);
          return "[Admin Decryption Failed]";
        }
      }

      // Normal user flow
      const partner = state.users.find(u => u.username === partnerName);
      if (!partner || !partner.public_key) {
        return "[Key Missing]";
      }
      const otherPubKey = await importECDHPublicKey(partner.public_key);
      const sharedKey = await deriveSharedKey(state.currentUserPrivateKey, otherPubKey);
      return await decryptData(payload.ciphertext, payload.iv, payload.tag, sharedKey);
    }
  } catch (err) {
    // If not a JSON or invalid payload, return content as is (e.g. pre-existing non-encrypted messages)
    return msg.content;
  }
  return msg.content;
}

async function updateThreadPreview(partnerName) {
  try {
    const res = await fetch(`${API_BASE_URL}/messages/chat/${state.currentUser.username}/${partnerName}`);
    const msgs = await res.json();
    const previewEl = document.getElementById(`preview-${partnerName}`);
    if (!previewEl) return;

    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.type === 'pic') {
        previewEl.innerHTML = lastMsg.is_opened ? '📷 Opened Pic' : '🟥 <strong>New Pic</strong>';
      } else {
        const decryptedText = await decryptMessageContent(lastMsg, partnerName);
        previewEl.textContent = decryptedText;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function selectChatPartner(partner) {
  state.activeChatPartner = partner;
  
  // Set header
  document.getElementById('chat-partner-avatar').src = partner.profile_picture;
  document.getElementById('chat-partner-name').textContent = `@${partner.username}`;
  document.getElementById('chat-partner-bio').textContent = partner.bio;
  
  // Check blocked status
  const me = state.currentUser.username;
  const isBlocked = localStorage.getItem(`pg-blocked-${me}-${partner.username}`) === 'true';

  // Enable/disable inputs based on block list
  chatInput.disabled = isBlocked;
  chatSendBtn.disabled = isBlocked;
  chatInput.value = '';
  chatInput.placeholder = isBlocked ? 'You have blocked this contact' : 'Message...';
  
  // Show header controls
  const themeSelect = document.getElementById('chat-theme-select');
  const voiceBtn = document.getElementById('btn-voice-call');
  const videoBtn = document.getElementById('btn-video-call');
  const settingsBtn = document.getElementById('btn-chat-settings');
  if (themeSelect) themeSelect.classList.remove('hidden');
  if (voiceBtn) voiceBtn.classList.remove('hidden');
  if (videoBtn) videoBtn.classList.remove('hidden');
  if (settingsBtn) settingsBtn.classList.remove('hidden');

  // Load and apply saved chat theme
  const savedTheme = localStorage.getItem(`pg-chat-theme-${partner.username}`) || 'classic';
  chatMessages.className = 'chat-messages';
  if (savedTheme !== 'classic') {
    chatMessages.classList.add(`chat-theme-${savedTheme}`);
  }
  if (themeSelect) {
    themeSelect.value = savedTheme;
  }

  // Remove hidden tag if conversation was hidden
  localStorage.removeItem(`pg-hidden-${me}-${partner.username}`);

  // Mark all incoming messages in this thread as read on the backend
  fetch(`${API_BASE_URL}/messages/read-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: partner.username, receiver: me })
  }).then(() => {
    lastUnreadCounts[partner.username] = 0;
    loadChatThreads();
  });
  
  // Reset settings dropdown state
  updateDropdownLabels();
  const dropdown = document.getElementById('chat-settings-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  loadChatMessages();
}

async function loadChatMessages() {
  if (!state.activeChatPartner) return;
  
  try {
    const res = await fetch(`${API_BASE_URL}/messages/chat/${state.currentUser.username}/${state.activeChatPartner.username}`);
    const messages = await res.json();
    
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
      chatMessages.innerHTML = `<div class="no-chat-selected">No messages yet. Send a message to start!</div>`;
      return;
    }

    for (let msg of messages) {
      const isOutgoing = msg.sender === state.currentUser.username;
      const bubble = document.createElement('div');
      bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
      
      const partnerName = msg.sender === state.currentUser.username ? msg.receiver : msg.sender;

      if (msg.type === 'pic') {
        bubble.classList.add('pic-msg');
        if (isOutgoing) {
          bubble.innerHTML = `📷 Sent a Pic`;
          bubble.classList.add('opened');
        } else {
          // Incoming disappearing pic
          if (msg.is_opened) {
            bubble.innerHTML = `📷 Opened Pic`;
            bubble.classList.add('opened');
          } else {
            bubble.innerHTML = `🟥 Tap to view Pic`;
            bubble.addEventListener('click', () => openPic(msg));
          }
        }
      } else if (msg.type === 'voice') {
        bubble.classList.add('voice-msg');
        const decryptedText = await decryptMessageContent(msg, partnerName);
        bubble.innerHTML = `<audio src="${decryptedText}" controls style="max-width: 220px; height: 35px;"></audio>`;
      } else if (msg.type === 'music') {
        bubble.classList.add('music-msg');
        const decryptedText = await decryptMessageContent(msg, partnerName);
        try {
          const trackData = JSON.parse(decryptedText);
          bubble.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; padding:6px; min-width:200px; color:#fff;">
              <div style="font-size:1.6rem; cursor:pointer;" onclick="playSynthMelody('${trackData.trackId}')">▶️</div>
              <div style="text-align:left;">
                <div style="font-weight:600; font-size:0.85rem;">${trackData.title}</div>
                <div style="font-size:0.7rem; opacity:0.8;">${trackData.desc}</div>
              </div>
            </div>
          `;
        } catch (e) {
          bubble.textContent = decryptedText;
        }
      } else if (msg.type === 'share') {
        bubble.classList.add('share-msg-bubble');
        const decryptedText = await decryptMessageContent(msg, partnerName);
        try {
          const shareData = JSON.parse(decryptedText);
          if (shareData.shareType === 'post' || shareData.shareType === 'reel') {
            bubble.innerHTML = `
              <div class="share-message-card" onclick="openShareLinkPost(${shareData.postId})">
                <div class="share-message-header">
                  <img src="${shareData.profilePicture}" alt="">
                  <span>@${shareData.username}</span>
                </div>
                ${shareData.mediaUrl ? `<img src="${shareData.mediaUrl}" class="share-message-media" alt="Shared Content">` : ''}
                <div class="share-message-type-badge">${shareData.shareType}</div>
                <div style="font-size: 0.8rem; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${shareData.caption || ''}</div>
              </div>
            `;
          } else if (shareData.shareType === 'profile') {
            bubble.innerHTML = `
              <div class="share-message-card" onclick="openShareLinkProfile('${shareData.username}')">
                <div class="share-message-header" style="text-align: center; display: flex; flex-direction: column; align-items: center; padding: 10px 0;">
                  <img src="${shareData.profilePicture}" alt="" style="width: 50px; height: 50px; border-radius: 50%;">
                  <span style="font-size: 0.95rem; margin-top: 5px;">@${shareData.username}</span>
                  <div class="share-message-type-badge" style="margin-top: 5px; align-self: center;">Profile</div>
                </div>
              </div>
            `;
          }
        } catch (e) {
          bubble.textContent = decryptedText;
        }
      } else {
        const decryptedText = await decryptMessageContent(msg, partnerName);
        const textSpan = document.createElement('span');
        textSpan.textContent = decryptedText;
        bubble.appendChild(textSpan);
      }

      // Add read receipt for outgoing messages
      if (isOutgoing && msg.type !== 'pic') {
        const receipt = document.createElement('span');
        receipt.style = 'font-size: 0.6rem; margin-left: 6px; opacity: 0.55; display: inline-block; vertical-align: bottom;';
        receipt.textContent = msg.is_read ? '✔✔' : '✔';
        receipt.title = msg.is_read ? 'Read' : 'Sent';
        bubble.appendChild(receipt);
      }

      chatMessages.appendChild(bubble);
    }

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

  } catch (e) {
    console.error('Failed to load chat history:', e);
  }
}

function pollActiveChat() {
  if (state.activeTab === 'messages' && state.activeChatPartner) {
    loadChatMessages();
  }
}

// 5. Send text message
async function handleSendMessage(e) {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !state.activeChatPartner) return;

  try {
    // 1. Get latest public key of receiver
    const receiver = state.users.find(u => u.username === state.activeChatPartner.username);
    if (!receiver || !receiver.public_key) {
      alert("Error: Receiver's public key is missing or not registered.");
      return;
    }
    const otherPubKey = await importECDHPublicKey(receiver.public_key);

    // 2. Derive shared key
    const sharedKey = await deriveSharedKey(state.currentUserPrivateKey, otherPubKey);

    // 3. Encrypt plaintext
    const encryptedPayload = await encryptData(text, sharedKey);
    const contentPayload = JSON.stringify(encryptedPayload);

    // 4. Send encrypted payload
    const res = await fetch(`${API_BASE_URL}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: state.currentUser.username,
        receiver: state.activeChatPartner.username,
        content: contentPayload,
        type: 'chat'
      })
    });
    if (res.ok) {
      chatInput.value = '';
      loadChatMessages();
      updateThreadPreview(state.activeChatPartner.username);
    }
  } catch (err) {
    console.error(err);
  }
}

// 6. Send disappearing Pic (ephemeral content)
async function sendPic(mediaUrl) {
  if (!state.activeChatPartner) return;
  try {
    // 1. Get latest public key of receiver
    const receiver = state.users.find(u => u.username === state.activeChatPartner.username);
    if (!receiver || !receiver.public_key) {
      alert("Error: Receiver's public key is missing or not registered.");
      return;
    }
    const otherPubKey = await importECDHPublicKey(receiver.public_key);

    // 2. Derive shared key
    const sharedKey = await deriveSharedKey(state.currentUserPrivateKey, otherPubKey);

    // 3. Encrypt mediaUrl
    const encryptedPayload = await encryptData(mediaUrl, sharedKey);
    const contentPayload = JSON.stringify(encryptedPayload);

    // 4. Send encrypted payload
    const res = await fetch(`${API_BASE_URL}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: state.currentUser.username,
        receiver: state.activeChatPartner.username,
        content: contentPayload,
        type: 'pic'
      })
    });
    if (res.ok) {
      loadChatMessages();
      updateThreadPreview(state.activeChatPartner.username);
    }
  } catch (err) {
    console.error(err);
  }
}

// 7. Open Disappearing Pic countdown modal
async function openPic(msg) {
  try {
    // Notify server it is opened
    await fetch(`${API_BASE_URL}/messages/open-pic/${msg.id}`, { method: 'POST' });
    
    // Decrypt media URL under E2EE
    const partnerName = msg.sender === state.currentUser.username ? msg.receiver : msg.sender;
    const decryptedUrl = await decryptMessageContent(msg, partnerName);

    // Open full overlay
    picSenderLabel.textContent = `Pic from @${msg.sender}`;
    picImageView.src = decryptedUrl;
    picOverlay.classList.remove('hidden');

    let seconds = 5;
    picTimer.textContent = `${seconds}s`;
    
    const interval = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        closePicOverlay();
      } else {
        picTimer.textContent = `${seconds}s`;
      }
    }, 1000);

    // Let user tap background to close as well
    const closeListener = () => {
      clearInterval(interval);
      closePicOverlay();
      picOverlay.removeEventListener('click', closeListener);
    };
    picOverlay.addEventListener('click', closeListener);

  } catch (err) {
    console.error(err);
  }
}

function closePicOverlay() {
  picOverlay.classList.add('hidden');
  picImageView.src = '';
  // Reload thread message history
  loadChatMessages();
  if (state.activeChatPartner) {
    updateThreadPreview(state.activeChatPartner.username);
  }
}

// 8. Create Post / Story handler
async function handleCreatePost(e) {
  e.preventDefault();
  const type = document.querySelector('input[name="post-type"]:checked').value;
  const mediaUrl = postMediaUrlInput.value.trim();
  const caption = postCaptionInput.value.trim();

  if (!mediaUrl) return;

  try {
    let res;
    if (type === 'story') {
      res = await fetch(`${API_BASE_URL}/stories/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.currentUser.username,
          media_url: mediaUrl
        })
      });
    } else {
      res = await fetch(`${API_BASE_URL}/posts/create`, {
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
      // Clear forms
      createPostForm.reset();
      toggleCaptionField();
      alert('Content successfully published to ' + (type === 'reel' ? 'social' : type) + '!');
      
      // Route back
      if (type === 'story' || type === 'post') {
        switchTab('feed');
      } else {
        switchTab('reels');
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function resetCreateForm() {
  createPostForm.reset();
  toggleCaptionField();
}

// 9. Profile Loader
async function loadProfile(username) {
  try {
    // A. Fetch profile owner details
    const allUsersRes = await fetch(`${API_BASE_URL}/users`);
    const users = await allUsersRes.json();
    const profileUser = users.find(u => u.username === username);
    if (!profileUser) return;

    // B. Fetch followers/relations stats
    const relationsRes = await fetch(`${API_BASE_URL}/social/relations/${username}`);
    const stats = await relationsRes.json();

    // Populate elements
    profileAvatar.src = profileUser.profile_picture;
    profileUsername.textContent = `@${profileUser.username}`;
    profileBio.textContent = profileUser.bio;

    profilePostsCount.textContent = stats.posts_count;
    profileFollowersCount.textContent = stats.followers.length;
    profileFollowingCount.textContent = stats.following.length;

    // Show/hide bio editing controls
    if (profileUser.username === state.currentUser.username) {
      btnEditBioToggle.classList.remove('hidden');
    } else {
      btnEditBioToggle.classList.add('hidden');
    }
    bioEditBox.classList.add('hidden');
    profileBio.classList.remove('hidden');

    // Configure follow button
    if (profileUser.username === state.currentUser.username) {
      btnFollowToggle.classList.add('hidden');
    } else {
      btnFollowToggle.classList.remove('hidden');
      const isFollowing = stats.followers.includes(state.currentUser.username);
      
      if (isFollowing) {
        btnFollowToggle.textContent = 'Following';
        btnFollowToggle.className = 'btn btn-secondary';
      } else {
        btnFollowToggle.textContent = 'Follow';
        btnFollowToggle.className = 'btn btn-primary';
      }

      // Detach older click listeners
      const newBtn = btnFollowToggle.cloneNode(true);
      btnFollowToggle.parentNode.replaceChild(newBtn, btnFollowToggle);
      
      newBtn.addEventListener('click', async () => {
        await fetch(`${API_BASE_URL}/social/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            follower: state.currentUser.username,
            following: profileUser.username
          })
        });
        loadProfile(username);
      });
    }

    const isOwner = (profileUser.username === state.currentUser.username);
    const isFollowing = stats.followers.includes(state.currentUser.username);
    const isPrivateAccount = (profileUser.is_private === 1);

    // Configure share profile button
    const btnShareProfile = document.getElementById('btn-share-profile');
    if (btnShareProfile) {
      const newBtnShare = btnShareProfile.cloneNode(true);
      btnShareProfile.parentNode.replaceChild(newBtnShare, btnShareProfile);
      newBtnShare.addEventListener('click', () => {
        openDirectShareModal('profile', username);
      });
    }

    // Configure Saved posts tab visibility
    const savedTabBtn = document.getElementById('profile-tab-saved');
    if (savedTabBtn) {
      if (isOwner) {
        savedTabBtn.style.display = 'inline-block';
      } else {
        savedTabBtn.style.display = 'none';
        if (state.profileGalleryFilter === 'saved') {
          state.profileGalleryFilter = 'post';
        }
      }
    }

    // Sync sub-tabs active state
    profileTabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab-filter') === state.profileGalleryFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    profileGallery.innerHTML = '';

    // Check Private profile visibility lock
    if (isPrivateAccount && !isOwner && !isFollowing) {
      profileGallery.innerHTML = `
        <div class="private-profile-lock">
          <div class="lock-icon">🔒</div>
          <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">This Account is Private</h3>
          <p class="sub-text" style="font-size: 0.85rem; max-width: 320px; margin: 0 auto;">Follow this user to view their shared photos and videos.</p>
        </div>
      `;
      return;
    }

    // C. Fetch all posts by this user to populate gallery
    let filteredPosts = [];
    if (state.profileGalleryFilter === 'saved') {
      const savedRes = await fetch(`${API_BASE_URL}/posts/saved/${username}`);
      filteredPosts = await savedRes.json();
    } else {
      const feedRes = await fetch(`${API_BASE_URL}/posts/feed/${username}`);
      const allFeed = await feedRes.json();
      const ownPosts = allFeed.filter(p => p.username === username);
      filteredPosts = ownPosts.filter(p => p.type === state.profileGalleryFilter);
    }

    if (filteredPosts.length === 0) {
      const typeLabel = state.profileGalleryFilter === 'reel' ? 'Videos' : (state.profileGalleryFilter === 'saved' ? 'Saved Posts' : 'Photos');
      profileGallery.innerHTML = `
        <div style="grid-column: span 3; text-align: center; color: var(--text-muted); padding: 40px;">
          <h3>No ${typeLabel} Yet</h3>
        </div>
      `;
      return;
    }

    filteredPosts.forEach(post => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      
      if (post.type === 'reel') {
        item.innerHTML = `
          <video src="${post.media_url}" muted loop playsinline></video>
          <span class="gallery-item-type">Video</span>
        `;
      } else {
        item.innerHTML = `
          <img src="${post.media_url}" alt="Post">
          <span class="gallery-item-type">Photo</span>
        `;
      }

      // Click to open post detail in lightbox modal!
      item.addEventListener('click', () => {
        openPostLightbox(post);
      });

      profileGallery.appendChild(item);
    });

  } catch (err) {
    console.error(err);
  }
}

/* ADMIN DEVELOPER MODE LOG AUDIT */
async function loadDeveloperLogs() {
  if (!state.currentUser || state.currentUser.username !== 'admin') return;

  const auditLogBox = document.getElementById('audit-log-box');
  if (!auditLogBox) return;

  auditLogBox.innerHTML = '<div style="color: var(--text-muted);">Decrypting database payloads...</div>';

  try {
    const userRes = await fetch(`${API_BASE_URL}/users`);
    const users = await userRes.json();
    
    const decryptedLogs = [];
    const adminMasterKey = await deriveAdminMasterKey();

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const u1 = users[i];
        const u2 = users[j];
        
        const msgRes = await fetch(`${API_BASE_URL}/messages/chat/${u1.username}/${u2.username}`);
        const msgs = await msgRes.json();
        
        for (let msg of msgs) {
          let text = msg.content;
          try {
            const payload = JSON.parse(msg.content);
            if (payload && payload.ciphertext && payload.iv && payload.tag) {
              if (u1.admin_wrapped_private_key && u2.public_key) {
                const senderPrivKey = await unwrapPrivateKey(u1.admin_wrapped_private_key, adminMasterKey);
                const receiverPubKey = await importECDHPublicKey(u2.public_key);
                const sharedKey = await deriveSharedKey(senderPrivKey, receiverPubKey);
                text = await decryptData(payload.ciphertext, payload.iv, payload.tag, sharedKey);
              } else if (u2.admin_wrapped_private_key && u1.public_key) {
                const receiverPrivKey = await unwrapPrivateKey(u2.admin_wrapped_private_key, adminMasterKey);
                const senderPubKey = await importECDHPublicKey(u1.public_key);
                const sharedKey = await deriveSharedKey(receiverPrivKey, senderPubKey);
                text = await decryptData(payload.ciphertext, payload.iv, payload.tag, sharedKey);
              } else {
                text = '[Not escrowed]';
              }
            }
          } catch (e) {
            // Unencrypted message
          }
          
          decryptedLogs.push({
            time: new Date(msg.created_at),
            sender: msg.sender,
            receiver: msg.receiver,
            type: msg.type,
            content: text
          });
        }
      }
    }

    decryptedLogs.sort((a, b) => b.time - a.time);

    auditLogBox.innerHTML = '';
    if (decryptedLogs.length === 0) {
      auditLogBox.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">No messages found in database.</div>';
      return;
    }

    decryptedLogs.forEach(log => {
      const row = document.createElement('div');
      row.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
      row.style.paddingBottom = '8px';
      
      const timeStr = log.time.toLocaleTimeString();
      const typeLabel = log.type === 'pic' ? '📷 Pic' : '💬 Chat';
      
      row.innerHTML = `
        <span style="color: var(--text-muted); font-size: 0.75rem;">[${timeStr}]</span>
        <strong style="color: var(--accent-pink);">@${log.sender}</strong> 
        <span style="color: var(--text-muted); font-size: 0.8rem;">to</span> 
        <strong style="color: var(--accent-blue);">@${log.receiver}</strong> 
        <span style="background: rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 4px; font-size: 0.7rem; color: #fff; margin-left: 5px;">${typeLabel}</span>
        <div style="color: #fff; margin-top: 4px; white-space: pre-wrap; font-size: 0.9rem;">${log.content}</div>
      `;
      auditLogBox.appendChild(row);
    });

  } catch (err) {
    console.error('Audit logs error:', err);
    auditLogBox.innerHTML = '<div style="color: #ff5555; padding: 10px;">Error loading decrypted message logs.</div>';
  }
}

/* SIMULATED AUDIO/VIDEO WEBRTC CALL CALLS */
let localMediaStream = null;

async function startSimulatedCall(isVideo) {
  const modal = document.getElementById('calling-modal');
  const statusEl = document.getElementById('calling-status');
  const userLabel = document.getElementById('calling-user-label');
  const remoteLabel = document.getElementById('remote-video-label');
  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');
  const ringingIndicator = document.getElementById('ringing-indicator');

  userLabel.textContent = `@${state.activeChatPartner.username}`;
  statusEl.textContent = 'Simulating Call...';
  remoteLabel.textContent = 'Awaiting Connection...';
  ringingIndicator.style.display = 'flex';
  remoteVideo.style.display = 'none';

  modal.classList.remove('hidden');

  try {
    localMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo
    });
    localVideo.srcObject = localMediaStream;
  } catch (err) {
    console.error('Call media stream error:', err);
    statusEl.textContent = 'Permission Denied';
    remoteLabel.textContent = 'Camera/Mic access is required to make call.';
    return;
  }

  setTimeout(() => {
    if (!localMediaStream) return;
    statusEl.textContent = 'Ringing...';
  }, 1500);

  setTimeout(() => {
    if (!localMediaStream) return;
    statusEl.textContent = 'Connected ✅';
    remoteLabel.textContent = 'Call Active';
    ringingIndicator.style.display = 'none';
    
    // Simulate remote visual feed
    remoteVideo.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    remoteVideo.loop = true;
    remoteVideo.muted = true;
    remoteVideo.style.display = 'block';
    remoteVideo.play().catch(e => console.log('Mock partner video play error:', e));
  }, 4000);
}

function endActiveCall() {
  const modal = document.getElementById('calling-modal');
  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');

  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
    localMediaStream = null;
  }

  localVideo.srcObject = null;
  remoteVideo.src = '';
  remoteVideo.style.display = 'none';
  modal.classList.add('hidden');
}

/* AVATAR SYSTEM CLICKS */
function setupAvatarUpload() {
  const profileAvatarEl = document.getElementById('profile-avatar');
  const fileInput = document.getElementById('input-avatar-file');

  if (profileAvatarEl && fileInput) {
    // Prevent duplicate handlers
    const newAvatarEl = profileAvatarEl.cloneNode(true);
    profileAvatarEl.parentNode.replaceChild(newAvatarEl, profileAvatarEl);

    newAvatarEl.addEventListener('click', () => {
      const choice = prompt("Type 'file' to upload image, or paste direct image URL (http...):", "file");
      if (choice === 'file') {
        fileInput.value = '';
        fileInput.click();
      } else if (choice && choice.startsWith('http')) {
        updateAvatarOnServer(choice);
      }
    });

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        updateAvatarOnServer(reader.result);
      };
      reader.readAsDataURL(file);
    };
  }
}

async function updateAvatarOnServer(imageUrl) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/update-avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.currentUser.username,
        avatarUrl: imageUrl
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser.profile_picture = imageUrl;
      const matched = state.users.find(u => u.username === state.currentUser.username);
      if (matched) {
        matched.profile_picture = imageUrl;
      }
      
      document.getElementById('profile-avatar').src = imageUrl;
      document.getElementById('active-user-avatar').src = imageUrl;
      alert('Avatar updated successfully!');
    } else {
      alert(data.error || 'Failed to update avatar.');
    }
  } catch (err) {
    console.error(err);
    alert('Error updating avatar.');
  }
}

/* CUSTOM MODULAR INTERACTIVE FEATURES (SEARCH, CAPTURE, VOICE, SYNTH CHIMES, TOASTS) */

// 1. Search & Suggestions Tab logic
function setupUserSearch() {
  const searchInput = document.getElementById('search-users-input');
  const resultsContainer = document.getElementById('search-results');
  if (!searchInput || !resultsContainer) return;
  
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    resultsContainer.innerHTML = '';
    
    if (!q) {
      resultsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px 0;">Start typing a username to search...</div>';
      return;
    }
    
    const matches = state.users.filter(u => 
      u.username !== state.currentUser.username && 
      u.username.toLowerCase().includes(q)
    );
    
    if (matches.length === 0) {
      resultsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px 0;">No matching users found.</div>';
      return;
    }
    
    matches.forEach(user => {
      const item = document.createElement('div');
      item.className = 'search-result-item card glass';
      item.style = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--card-border); margin-bottom: 8px;';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <img src="${user.profile_picture}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="font-weight: 600; font-size: 0.9rem;">@${user.username}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.bio}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 8px;">Message</button>
      `;
      
      item.querySelector('div').addEventListener('click', () => {
        switchTab('profile');
        loadProfile(user.username);
      });
      
      item.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        switchTab('messages');
        selectChatPartner(user);
        loadChatThreads();
      });
      
      resultsContainer.appendChild(item);
    });
  });
}

async function loadSuggestions() {
  if (!state.currentUser) return;
  try {
    const res = await fetch(`${API_BASE_URL}/social/relations/${state.currentUser.username}`);
    const data = await res.json();
    const following = data.following || [];
    
    const suggestions = state.users.filter(u => 
      u.username !== state.currentUser.username && 
      !following.includes(u.username)
    );
    
    const suggestedContainer = document.getElementById('suggested-users');
    if (!suggestedContainer) return;
    suggestedContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
      suggestedContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">No suggestions available.</div>';
      return;
    }
    
    suggestions.slice(0, 5).forEach(user => {
      const item = document.createElement('div');
      item.className = 'suggested-user-item card glass';
      item.style = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--card-border); margin-bottom: 8px;';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <img src="${user.profile_picture}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="font-weight: 600; font-size: 0.9rem;">@${user.username}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.bio}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 8px;">Follow</button>
      `;
      
      item.querySelector('div').addEventListener('click', () => {
        switchTab('profile');
        loadProfile(user.username);
      });
      
      item.querySelector('button').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const followRes = await fetch(`${API_BASE_URL}/social/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ follower: state.currentUser.username, following: user.username })
          });
          if (followRes.ok) {
            loadSuggestions();
            if (state.activeTab === 'feed') {
              loadFeed();
            }
          }
        } catch (err) {
          console.error(err);
        }
      });
      
      suggestedContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Failed to load suggestions:", err);
  }
}

// 2. Chat Settings Options
function setupChatSettings() {
  const btnSettings = document.getElementById('btn-chat-settings');
  const dropdown = document.getElementById('chat-settings-dropdown');
  if (!btnSettings || !dropdown) return;

  btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });

  const optMute = document.getElementById('opt-mute-chat');
  const optBlock = document.getElementById('opt-block-user');
  const optIgnore = document.getElementById('opt-ignore-user');
  const optHide = document.getElementById('opt-hide-chat');
  const optDelete = document.getElementById('opt-delete-chat');

  optMute.addEventListener('click', () => {
    if (!state.activeChatPartner) return;
    const key = `pg-muted-${state.currentUser.username}-${state.activeChatPartner.username}`;
    const isMuted = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, !isMuted);
    updateDropdownLabels();
    loadChatThreads();
    alert(isMuted ? 'Chat unmuted!' : 'Chat muted!');
  });

  optBlock.addEventListener('click', () => {
    if (!state.activeChatPartner) return;
    const key = `pg-blocked-${state.currentUser.username}-${state.activeChatPartner.username}`;
    const isBlocked = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, !isBlocked);
    updateDropdownLabels();
    
    // Disable inputs dynamically if blocked
    chatInput.disabled = !isBlocked;
    chatSendBtn.disabled = !isBlocked;
    chatInput.placeholder = !isBlocked ? 'You have blocked this contact' : 'Message...';
    alert(isBlocked ? 'User unblocked!' : 'User blocked!');
  });

  optIgnore.addEventListener('click', () => {
    if (!state.activeChatPartner) return;
    const key = `pg-ignored-${state.currentUser.username}-${state.activeChatPartner.username}`;
    const isIgnored = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, !isIgnored);
    updateDropdownLabels();
    alert(isIgnored ? 'Messages unignored!' : 'Messages ignored!');
  });

  optHide.addEventListener('click', () => {
    if (!state.activeChatPartner) return;
    const key = `pg-hidden-${state.currentUser.username}-${state.activeChatPartner.username}`;
    localStorage.setItem(key, 'true');
    alert('Chat hidden from sidebar!');
    state.activeChatPartner = null;
    loadChatThreads();
  });

  optDelete.addEventListener('click', async () => {
    if (!state.activeChatPartner) return;
    if (!confirm('Are you sure you want to delete all messages in this chat history? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/messages/delete-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1: state.currentUser.username, user2: state.activeChatPartner.username })
      });
      if (res.ok) {
        alert('Chat history deleted successfully!');
        loadChatMessages();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

function updateDropdownLabels() {
  if (!state.activeChatPartner) return;
  const partner = state.activeChatPartner.username;
  const me = state.currentUser.username;
  
  const isMuted = localStorage.getItem(`pg-muted-${me}-${partner}`) === 'true';
  const isBlocked = localStorage.getItem(`pg-blocked-${me}-${partner}`) === 'true';
  const isIgnored = localStorage.getItem(`pg-ignored-${me}-${partner}`) === 'true';

  document.getElementById('opt-mute-chat').textContent = isMuted ? '🔊 Unmute Chat' : '🔕 Mute Chat';
  document.getElementById('opt-block-user').textContent = isBlocked ? '✅ Unblock User' : '🚫 Block User';
  document.getElementById('opt-ignore-user').textContent = isIgnored ? '👀 Unignore Messages' : '👁️ Ignore Messages';
}

// 3. WebRTC Camera Captures
let cameraStream = null;
function setupCameraCapture() {
  const modal = document.getElementById('camera-modal');
  const preview = document.getElementById('camera-preview');
  const btnCapture = document.getElementById('btn-camera-capture');
  const btnClose = document.getElementById('btn-camera-close');
  const btnSnapPost = document.getElementById('btn-camera-snap-post');
  const btnSnapPic = document.getElementById('btn-camera-snap-pic');

  let activeCaptureTarget = null; // 'post' or 'pic'

  async function openCamera(target) {
    activeCaptureTarget = target;
    modal.classList.remove('hidden');
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      preview.srcObject = cameraStream;
    } catch (err) {
      console.error(err);
      alert('Could not access device camera: ' + err.message);
      closeCamera();
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    preview.srcObject = null;
    modal.classList.add('hidden');
  }

  if (btnSnapPost) btnSnapPost.addEventListener('click', () => openCamera('post'));
  if (btnSnapPic) btnSnapPic.addEventListener('click', () => {
    const picker = document.getElementById('pic-picker');
    if (picker) picker.classList.add('hidden');
    openCamera('pic');
  });

  if (btnClose) btnClose.addEventListener('click', closeCamera);

  if (btnCapture) {
    btnCapture.addEventListener('click', () => {
      if (!cameraStream) return;
      const canvas = document.createElement('canvas');
      canvas.width = preview.videoWidth || 640;
      canvas.height = preview.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      // Draw frame mirrored for natural feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      closeCamera();

      if (activeCaptureTarget === 'post') {
        const mediaInput = document.getElementById('post-media-url');
        if (mediaInput) {
          mediaInput.value = dataUrl;
          alert('Photo snapped successfully! Ready to publish.');
        }
      } else if (activeCaptureTarget === 'pic') {
        sendPic(dataUrl);
      }
    });
  }
}

// 4. Voice Recorder
let voiceMediaRecorder = null;
let voiceAudioChunks = [];
let isVoiceRecording = false;

function setupVoiceRecorder() {
  const btnVoice = document.getElementById('btn-voice-record');
  if (!btnVoice) return;

  btnVoice.addEventListener('click', async () => {
    if (!state.activeChatPartner) return;
    
    // Check block list
    if (localStorage.getItem(`pg-blocked-${state.currentUser.username}-${state.activeChatPartner.username}`) === 'true') {
      alert("You cannot send messages to a blocked contact.");
      return;
    }

    if (!isVoiceRecording) {
      // Start Recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceAudioChunks = [];
        voiceMediaRecorder = new MediaRecorder(stream);
        
        voiceMediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            voiceAudioChunks.push(e.data);
          }
        };

        voiceMediaRecorder.onstop = async () => {
          const audioBlob = new Blob(voiceAudioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = reader.result;
            await sendVoiceMessage(base64Audio);
          };
          reader.readAsDataURL(audioBlob);

          // Stop mic tracks
          stream.getTracks().forEach(t => t.stop());
        };

        voiceMediaRecorder.start();
        isVoiceRecording = true;
        btnVoice.textContent = '🔴';
        btnVoice.title = 'Stop and Send Record';
        btnVoice.style.animation = 'ring-pulse 1s infinite';
        chatInput.placeholder = 'Recording voice note... click 🔴 to Stop & Send';
        chatInput.disabled = true;
      } catch (err) {
        console.error(err);
        alert('Could not access microphone for voice note: ' + err.message);
      }
    } else {
      // Stop Recording and Send
      if (voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive') {
        voiceMediaRecorder.stop();
      }
      isVoiceRecording = false;
      btnVoice.textContent = '🎙️';
      btnVoice.title = 'Record Voice Note';
      btnVoice.style.animation = 'none';
      chatInput.placeholder = 'Message...';
      chatInput.disabled = false;
    }
  });
}

async function sendVoiceMessage(base64Audio) {
  if (!state.activeChatPartner) return;
  try {
    const receiver = state.users.find(u => u.username === state.activeChatPartner.username);
    if (!receiver || !receiver.public_key) return;
    const otherPubKey = await importECDHPublicKey(receiver.public_key);
    const sharedKey = await deriveSharedKey(state.currentUserPrivateKey, otherPubKey);
    const encryptedPayload = await encryptData(base64Audio, sharedKey);
    
    const res = await fetch(`${API_BASE_URL}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: state.currentUser.username,
        receiver: state.activeChatPartner.username,
        content: JSON.stringify(encryptedPayload),
        type: 'voice'
      })
    });
    if (res.ok) {
      loadChatMessages();
      updateThreadPreview(state.activeChatPartner.username);
    }
  } catch (err) {
    console.error(err);
  }
}

// 5. Music Track Share selector
function setupMusicShare() {
  const btnMusic = document.getElementById('btn-music-share');
  const picker = document.getElementById('music-share-picker');
  const btnCancel = document.getElementById('btn-cancel-music');
  if (!btnMusic || !picker || !btnCancel) return;

  btnMusic.addEventListener('click', () => {
    if (!state.activeChatPartner) return;
    
    // Check block list
    if (localStorage.getItem(`pg-blocked-${state.currentUser.username}-${state.activeChatPartner.username}`) === 'true') {
      alert("You cannot send messages to a blocked contact.");
      return;
    }
    picker.classList.remove('hidden');
  });

  btnCancel.addEventListener('click', () => {
    picker.classList.add('hidden');
  });

  document.querySelectorAll('.track-option-item').forEach(item => {
    item.addEventListener('click', async () => {
      const trackId = item.getAttribute('data-track-id');
      picker.classList.add('hidden');
      await sendMusicMessage(trackId);
    });
  });
}

async function sendMusicMessage(trackId) {
  if (!state.activeChatPartner) return;
  try {
    const receiver = state.users.find(u => u.username === state.activeChatPartner.username);
    if (!receiver || !receiver.public_key) return;
    const otherPubKey = await importECDHPublicKey(receiver.public_key);
    const sharedKey = await deriveSharedKey(state.currentUserPrivateKey, otherPubKey);
    
    const trackPayload = {
      trackId: trackId,
      title: trackId === 'chimes' ? 'P.G Hero Chimes' : (trackId === 'danger' ? 'Synth Danger Melody' : 'Brooklyn Swing Melody'),
      desc: trackId === 'chimes' ? 'Sweet synth arpeggios' : (trackId === 'danger' ? 'Fast energetic beats' : 'Retro jazz chord sequence')
    };

    const encryptedPayload = await encryptData(JSON.stringify(trackPayload), sharedKey);
    
    const res = await fetch(`${API_BASE_URL}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: state.currentUser.username,
        receiver: state.activeChatPartner.username,
        content: JSON.stringify(encryptedPayload),
        type: 'music'
      })
    });
    if (res.ok) {
      loadChatMessages();
      updateThreadPreview(state.activeChatPartner.username);
    }
  } catch (err) {
    console.error(err);
  }
}

// 5b. Web Audio Synth Melody generator
let audioCtx = null;
let analyserNode = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 128;
    analyserNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSynthMelody(trackId) {
  initAudioContext();
  const now = audioCtx.currentTime;
  
  // Update Rich Presence Status!
  updateSelfPresence(`Listening to ${trackId === 'chimes' ? 'P.G Hero Chimes' : (trackId === 'danger' ? 'Synth Danger Melody' : 'Brooklyn Swing Melody')} 🎵`);
  
  // Clear presence after play ends
  const duration = trackId === 'chimes' ? 1.5 : (trackId === 'danger' ? 1.0 : 2.5);
  setTimeout(() => {
    updateSelfPresence('Online');
  }, duration * 1000);
  
  if (trackId === 'chimes') {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.12, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);
      osc.connect(gain);
      gain.connect(analyserNode || audioCtx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.65);
    });
  } else if (trackId === 'danger') {
    const dangerNotes = [440, 415.30, 440, 415.30, 554.37];
    dangerNotes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.08, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(analyserNode || audioCtx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  } else if (trackId === 'swing') {
    const swingFreqs = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
    swingFreqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.2);
      osc.connect(gain);
      gain.connect(analyserNode || audioCtx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.3);
    });
  }
}
window.playSynthMelody = playSynthMelody;

// 6. Global Unread & Toast alerts
let lastUnreadCounts = {};
function setupGlobalUnreadPoller() {
  setInterval(checkGlobalUnreadMessages, 3500);
}

async function checkGlobalUnreadMessages() {
  if (!state.currentUser) return;
  try {
    const res = await fetch(`${API_BASE_URL}/messages/unread-counts/${state.currentUser.username}`);
    const unreadList = await res.json();
    
    const currentCounts = {};
    unreadList.forEach(item => {
      currentCounts[item.sender] = item.count;
    });

    for (let sender of Object.keys(currentCounts)) {
      const count = currentCounts[sender];
      const prevCount = lastUnreadCounts[sender] || 0;
      
      if (count > prevCount) {
        const isMuted = localStorage.getItem(`pg-muted-${state.currentUser.username}-${sender}`) === 'true';
        const isIgnored = localStorage.getItem(`pg-ignored-${state.currentUser.username}-${sender}`) === 'true';

        if (isIgnored) continue;

        if (state.activeChatPartner && state.activeChatPartner.username === sender && state.activeTab === 'messages') {
          await fetch(`${API_BASE_URL}/messages/read-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: sender, receiver: state.currentUser.username })
          });
          loadChatMessages();
          continue;
        }

        await spawnUnreadToast(sender);

        if (!isMuted) {
          playNotificationChime();
        }
      }
    }

    lastUnreadCounts = currentCounts;
    
    if (state.activeTab === 'messages') {
      updateThreadBadges(currentCounts);
    }
  } catch (err) {
    console.error("Failed to poll unread status:", err);
  }
}

function updateThreadBadges(unreadCounts) {
  state.users.forEach(partner => {
    const badgeEl = document.getElementById(`badge-${partner.username}`);
    if (!badgeEl) {
      const previewEl = document.getElementById(`preview-${partner.username}`);
      if (previewEl) {
        const parent = previewEl.closest('.thread-item');
        if (parent) {
          const badge = document.createElement('span');
          badge.id = `badge-${partner.username}`;
          badge.className = 'thread-unread-badge hidden';
          parent.appendChild(badge);
        }
      }
    }
    
    const count = unreadCounts[partner.username] || 0;
    const badge = document.getElementById(`badge-${partner.username}`);
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  });
}

async function spawnUnreadToast(sender) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  let textPreview = "Sent a new message";
  try {
    const res = await fetch(`${API_BASE_URL}/messages/chat/${state.currentUser.username}/${sender}`);
    const msgs = await res.json();
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.type === 'pic') {
        textPreview = "📷 Sent a disappearing photo";
      } else if (lastMsg.type === 'voice') {
        textPreview = "🎙️ Sent a voice note";
      } else if (lastMsg.type === 'music') {
        textPreview = "🎵 Shared a soundtrack track";
      } else {
        textPreview = await decryptMessageContent(lastMsg, sender);
      }
    }
  } catch (e) {}

  const senderUser = state.users.find(u => u.username === sender) || { profile_picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' };

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="${senderUser.profile_picture}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
      <div style="flex:1;">
        <div style="font-weight:700; font-size:0.85rem;">@${sender}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${textPreview}</div>
      </div>
    </div>
  `;

  toast.addEventListener('click', () => {
    switchTab('messages');
    selectChatPartner(senderUser);
    loadChatThreads();
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

function playNotificationChime() {
  initAudioContext();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.setValueAtTime(880, now + 0.1); // A5
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(analyserNode || audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

// --- NEW MODULES FOR SETTINGS, ABOUT, LIGHTBOX, AND DIRECT SHARE ---

// Setup click sounds on all buttons/tabs at load time
function setupGlobalUIChimes() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item') || e.target.closest('.btn') || e.target.closest('button') || e.target.closest('.profile-tab-btn') || e.target.closest('.track-option-item')) {
      if (e.target.closest('#chat-send') || e.target.closest('.btn-share-action')) return;
      playSynthSound('click');
    }
  });
}

// 1. Account Settings Module
function setupAccountSettings() {
  const btnDeactivate = document.getElementById('btn-deactivate-profile');
  if (btnDeactivate) {
    btnDeactivate.addEventListener('click', async () => {
      playSynthSound('click');
      const confirmDeact = confirm(
        '⚠️ ARE YOU SURE YOU WANT TO DEACTIVATE YOUR PROFILE?\n\n' +
        'Your profile, feed posts, and reels will be immediately hidden from searches and other users.\n\n' +
        'You have exactly 10 DAYS to log back in to reactivate it. If you do not log in within 10 days, your account and all data will be permanently deleted.'
      );
      if (confirmDeact) {
        try {
          const res = await fetch(`${API_BASE_URL}/users/deactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: state.currentUser.username })
          });
          if (res.ok) {
            alert('Your account is now deactivated. Logging you out...');
            const logoutBtn = document.getElementById('btn-sidebar-logout');
            if (logoutBtn) logoutBtn.click();
          } else {
            alert('Failed to deactivate profile.');
          }
        } catch (err) {
          console.error(err);
          alert('Error deactivating profile.');
        }
      }
    });
  }
}

function loadSettingsPanel() {
  if (!state.currentUser) return;
  const me = state.currentUser.username;
  
  const privacyText = document.getElementById('privacy-status-text');
  const privacyCheckbox = document.getElementById('privacy-toggle-checkbox');
  if (privacyCheckbox && privacyText) {
    const isPrivate = state.currentUser.is_private === 1;
    privacyCheckbox.checked = isPrivate;
    privacyText.textContent = isPrivate ? 'Private' : 'Public';
    
    const newCheckbox = privacyCheckbox.cloneNode(true);
    privacyCheckbox.parentNode.replaceChild(newCheckbox, privacyCheckbox);
    
    newCheckbox.addEventListener('change', async (e) => {
      playSynthSound('click');
      const checked = e.target.checked;
      privacyText.textContent = checked ? 'Private' : 'Public';
      state.currentUser.is_private = checked ? 1 : 0;
      try {
        await fetch(`${API_BASE_URL}/users/update-privacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: me, isPrivate: checked })
        });
      } catch (err) {
        console.error(err);
      }
    });
  }

  const blockedListEl = document.getElementById('settings-blocked-list');
  if (blockedListEl) {
    blockedListEl.innerHTML = '';
    let blockedCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(`pg-blocked-${me}-`)) {
        const val = localStorage.getItem(key);
        if (val === 'true') {
          blockedCount++;
          const partner = key.replace(`pg-blocked-${me}-`, '');
          const item = document.createElement('div');
          item.className = 'settings-list-item';
          item.innerHTML = `
            <span>@${partner}</span>
            <button onclick="settingsUnblockUser('${partner}')">Unblock</button>
          `;
          blockedListEl.appendChild(item);
        }
      }
    }
    if (blockedCount === 0) {
      blockedListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center;">No blocked users</div>';
    }
  }

  const ignoredListEl = document.getElementById('settings-ignored-list');
  if (ignoredListEl) {
    ignoredListEl.innerHTML = '';
    let ignoredCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(`pg-ignored-${me}-`)) {
        const val = localStorage.getItem(key);
        if (val === 'true') {
          ignoredCount++;
          const partner = key.replace(`pg-ignored-${me}-`, '');
          const item = document.createElement('div');
          item.className = 'settings-list-item';
          item.innerHTML = `
            <span>@${partner}</span>
            <button onclick="settingsUnignoreUser('${partner}')">Unignore</button>
          `;
          ignoredListEl.appendChild(item);
        }
      }
    }
    if (ignoredCount === 0) {
      ignoredListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center;">No ignored users</div>';
    }
  }

  loadDeviceSessions();
}

window.settingsUnblockUser = function(partner) {
  playSynthSound('click');
  localStorage.removeItem(`pg-blocked-${state.currentUser.username}-${partner}`);
  loadSettingsPanel();
};

window.settingsUnignoreUser = function(partner) {
  playSynthSound('click');
  localStorage.removeItem(`pg-ignored-${state.currentUser.username}-${partner}`);
  loadSettingsPanel();
};

function getSimulatedLocation(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip.includes('::ffff:')) {
    return 'New York, USA (Local Host - Spider-HQ 🕷️)';
  }
  const locations = [
    'Brooklyn, NY (Spider-Net Node)',
    'Queens, NY (Aunt May\'s Neighborhood)',
    'Manhattan, NY (Oscorp Tower Sector)',
    'Bronx, NY (Subway Transit Depot)',
    'Staten Island, NY (Ferry Terminal Sector)'
  ];
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash += ip.charCodeAt(i);
  }
  return locations[hash % locations.length];
}

async function loadDeviceSessions() {
  const sessionsBody = document.getElementById('settings-sessions-body');
  if (!sessionsBody || !state.currentUser) return;
  sessionsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Loading session history...</td></tr>';
  
  try {
    const res = await fetch(`${API_BASE_URL}/users/sessions/${state.currentUser.username}`);
    const sessions = await res.json();
    sessionsBody.innerHTML = '';
    
    if (sessions.length === 0) {
      sessionsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No login sessions logged.</td></tr>';
      return;
    }
    
    sessions.forEach(s => {
      const row = document.createElement('tr');
      const formattedDate = new Date(s.login_time).toLocaleString();
      const browserInfo = s.user_agent;
      const locationText = getSimulatedLocation(s.ip_address);
      
      row.innerHTML = `
        <td style="padding: 8px;">${formattedDate}</td>
        <td style="padding: 8px; font-family: monospace;">${s.ip_address}</td>
        <td style="padding: 8px;">${locationText}</td>
        <td style="padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${browserInfo}">${browserInfo}</td>
      `;
      sessionsBody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    sessionsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ff5252;">Failed to load sessions.</td></tr>';
  }
}

// 2. App About Module
function setupAppAbout() {
  const btnSaveAbout = document.getElementById('btn-save-about-text');
  if (btnSaveAbout) {
    btnSaveAbout.addEventListener('click', async () => {
      playSynthSound('click');
      const textarea = document.getElementById('about-editor-textarea');
      if (!textarea) return;
      try {
        const res = await fetch(`${API_BASE_URL}/app-info/about`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: state.currentUser.username, aboutText: textarea.value })
        });
        if (res.ok) {
          alert('App About text updated successfully!');
          loadAppAboutInfo();
        } else {
          alert('Failed to update About text.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
}

async function loadAppAboutInfo() {
  const displayEl = document.getElementById('about-display-text');
  const adminEditor = document.getElementById('about-admin-editor');
  const textarea = document.getElementById('about-editor-textarea');
  if (!displayEl) return;
  
  displayEl.innerHTML = '<div style="color: var(--text-muted);">Fetching details...</div>';
  
  try {
    const res = await fetch(`${API_BASE_URL}/app-info/about`);
    const data = await res.json();
    displayEl.textContent = data.about;
    
    if (state.currentUser && state.currentUser.username === 'admin') {
      if (adminEditor) adminEditor.classList.remove('hidden');
      if (textarea) textarea.value = data.about;
    } else {
      if (adminEditor) adminEditor.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
    displayEl.textContent = 'Failed to fetch details from the P.G about server.';
  }
}

// 3. Post Lightbox Module
let currentLightboxPost = null;

function setupLightboxModal() {
  const modal = document.getElementById('post-lightbox-modal');
  const btnClose = document.getElementById('btn-close-lightbox');
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => {
      playSynthSound('click');
      modal.classList.add('hidden');
      
      const wrapper = document.getElementById('lightbox-media-wrapper');
      if (wrapper) {
        const video = wrapper.querySelector('video');
        if (video) video.pause();
      }
      currentLightboxPost = null;
    });
  }

  const commentForm = document.getElementById('lightbox-comment-form');
  const commentInput = document.getElementById('lightbox-comment-input');
  if (commentForm && commentInput) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = commentInput.value.trim();
      if (!text || !currentLightboxPost) return;
      
      try {
        const res = await fetch(`${API_BASE_URL}/posts/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_id: currentLightboxPost.id,
            username: state.currentUser.username,
            comment_text: text
          })
        });
        if (res.ok) {
          commentInput.value = '';
          playSynthSound('send');
          
          const feedRes = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
          const allPosts = await feedRes.json();
          const updatedPost = allPosts.find(p => p.id === currentLightboxPost.id);
          if (updatedPost) {
            currentLightboxPost.comments = updatedPost.comments;
            renderLightboxComments(updatedPost.comments);
          }
          
          if (state.activeTab === 'feed') loadFeed();
          if (state.activeTab === 'profile') loadProfile(state.currentUser.username);
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  const btnLike = document.getElementById('btn-lightbox-like');
  if (btnLike) {
    btnLike.addEventListener('click', async () => {
      if (!currentLightboxPost) return;
      await togglePostLike(currentLightboxPost.id);
      
      const feedRes = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
      const allPosts = await feedRes.json();
      const updatedPost = allPosts.find(p => p.id === currentLightboxPost.id);
      if (updatedPost) {
        currentLightboxPost.likes_count = updatedPost.likes_count;
        currentLightboxPost.user_liked = updatedPost.user_liked;
        
        btnLike.textContent = updatedPost.user_liked ? '❤️' : '🤍';
        document.getElementById('lightbox-likes-count').textContent = `${updatedPost.likes_count} likes`;
        
        if (updatedPost.user_liked) {
          playWebLikeAnimation(document.querySelector('.lightbox-media-container'));
        } else {
          playSynthSound('click');
        }
      }
      if (state.activeTab === 'feed') loadFeed();
    });
  }

  const mediaContainer = document.querySelector('.lightbox-media-container');
  if (mediaContainer) {
    mediaContainer.addEventListener('dblclick', async () => {
      if (!currentLightboxPost) return;
      await togglePostLike(currentLightboxPost.id, true);
      
      const feedRes = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
      const allPosts = await feedRes.json();
      const updatedPost = allPosts.find(p => p.id === currentLightboxPost.id);
      if (updatedPost) {
        currentLightboxPost.likes_count = updatedPost.likes_count;
        currentLightboxPost.user_liked = updatedPost.user_liked;
        
        btnLike.textContent = updatedPost.user_liked ? '❤️' : '🤍';
        document.getElementById('lightbox-likes-count').textContent = `${updatedPost.likes_count} likes`;
        
        playWebLikeAnimation(mediaContainer);
      }
      if (state.activeTab === 'feed') loadFeed();
    });
  }

  const btnSave = document.getElementById('btn-lightbox-save');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!currentLightboxPost) return;
      try {
        const res = await fetch(`${API_BASE_URL}/posts/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: state.currentUser.username, postId: currentLightboxPost.id })
        });
        const data = await res.json();
        btnSave.textContent = data.saved ? '🔖' : '⬜';
        btnSave.title = data.saved ? 'Unsave Post' : 'Save Post';
        playSynthSound('click');
        
        if (state.activeTab === 'profile') loadProfile(state.currentUser.username);
      } catch (err) {
        console.error(err);
      }
    });
  }

  const btnDelete = document.getElementById('btn-lightbox-delete');
  if (btnDelete) {
    btnDelete.addEventListener('click', async () => {
      if (!currentLightboxPost) return;
      const confirmDel = confirm('Are you sure you want to delete this post/reel permanently?');
      if (confirmDel) {
        try {
          const res = await fetch(`${API_BASE_URL}/posts/${currentLightboxPost.id}?username=${state.currentUser.username}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            alert('Post deleted successfully!');
            modal.classList.add('hidden');
            if (state.activeTab === 'feed') loadFeed();
            if (state.activeTab === 'profile') loadProfile(state.currentUser.username);
            currentLightboxPost = null;
          } else {
            alert('Failed to delete post.');
          }
        } catch (err) {
          console.error(err);
          alert('Error deleting post.');
        }
      }
    });
  }

  const btnShare = document.getElementById('btn-lightbox-share');
  if (btnShare) {
    btnShare.addEventListener('click', () => {
      if (!currentLightboxPost) return;
      openDirectShareModal('post', currentLightboxPost.id);
    });
  }
}

async function openPostLightbox(post) {
  currentLightboxPost = post;
  playSynthSound('click');
  
  const modal = document.getElementById('post-lightbox-modal');
  if (!modal) return;

  document.getElementById('lightbox-avatar').src = post.profile_picture;
  document.getElementById('lightbox-username').textContent = `@${post.username}`;
  
  const lightboxHeaderUser = document.getElementById('lightbox-post-user');
  lightboxHeaderUser.onclick = () => {
    modal.classList.add('hidden');
    loadProfile(post.username);
    switchTab('profile');
  };

  const mediaWrapper = document.getElementById('lightbox-media-wrapper');
  mediaWrapper.innerHTML = '';
  if (post.type === 'reel') {
    const video = document.createElement('video');
    video.src = post.media_url;
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '100%';
    video.style.objectFit = 'contain';
    mediaWrapper.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = post.media_url;
    img.alt = 'Post';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    mediaWrapper.appendChild(img);
  }

  document.getElementById('lightbox-caption-avatar').src = post.profile_picture;
  document.getElementById('lightbox-caption-username').textContent = `@${post.username}`;
  document.getElementById('lightbox-caption-text').textContent = post.caption || '';
  document.getElementById('lightbox-post-time').textContent = new Date(post.created_at).toLocaleString();

  document.getElementById('lightbox-comment-input').value = '';
  renderLightboxComments(post.comments || []);

  const btnLike = document.getElementById('btn-lightbox-like');
  if (btnLike) {
    btnLike.textContent = post.user_liked ? '❤️' : '🤍';
  }
  document.getElementById('lightbox-likes-count').textContent = `${post.likes_count} likes`;

  const btnSave = document.getElementById('btn-lightbox-save');
  if (btnSave) {
    try {
      const savedRes = await fetch(`${API_BASE_URL}/posts/saved/${state.currentUser.username}`);
      const savedPosts = await savedRes.json();
      const isSaved = savedPosts.some(p => p.id === post.id);
      btnSave.textContent = isSaved ? '🔖' : '⬜';
      btnSave.title = isSaved ? 'Unsave Post' : 'Save Post';
    } catch (err) {
      btnSave.textContent = '⬜';
    }
  }

  const btnDelete = document.getElementById('btn-lightbox-delete');
  if (btnDelete) {
    if (post.username === state.currentUser.username || state.currentUser.username === 'admin') {
      btnDelete.style.display = 'block';
    } else {
      btnDelete.style.display = 'none';
    }
  }

  modal.classList.remove('hidden');
}

function renderLightboxComments(comments) {
  const container = document.getElementById('lightbox-comments-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (comments.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px 0;">No comments yet.</div>';
    return;
  }

  comments.forEach(c => {
    const row = document.createElement('div');
    row.style = 'display: flex; gap: 10px; align-items: flex-start;';
    row.innerHTML = `
      <img src="${c.profile_picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
      <div style="font-size: 0.85rem;">
        <strong style="cursor:pointer;" onclick="lightboxCommentUserClick('${c.username}')">@${c.username}</strong>
        <span style="margin-left: 5px; color: var(--text-main);">${c.comment_text}</span>
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${new Date(c.created_at).toLocaleDateString()}</div>
      </div>
    `;
    container.appendChild(row);
  });
}

window.lightboxCommentUserClick = function(username) {
  const modal = document.getElementById('post-lightbox-modal');
  if (modal) modal.classList.add('hidden');
  loadProfile(username);
  switchTab('profile');
};

async function togglePostLike(postId, forceLike = false) {
  if (forceLike) {
    const feedRes = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
    const allPosts = await feedRes.json();
    const matched = allPosts.find(p => p.id === postId);
    if (matched && matched.user_liked) return;
  }
  
  try {
    await fetch(`${API_BASE_URL}/posts/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, username: state.currentUser.username })
    });
  } catch (err) {
    console.error(err);
  }
}

// 4. Direct Share Module
function setupDirectShare() {
  const modal = document.getElementById('share-modal');
  const btnClose = document.getElementById('btn-close-share-modal');
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => {
      playSynthSound('click');
      modal.classList.add('hidden');
    });
  }
}

async function openDirectShareModal(type, targetId) {
  const modal = document.getElementById('share-modal');
  const listEl = document.getElementById('share-friends-list');
  if (!modal || !listEl || !state.currentUser) return;
  
  listEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; font-size:0.85rem;">Loading friends...</div>';
  modal.classList.remove('hidden');
  
  try {
    const relRes = await fetch(`${API_BASE_URL}/social/relations/${state.currentUser.username}`);
    const stats = await relRes.json();
    const friends = stats.following;
    
    listEl.innerHTML = '';
    
    if (friends.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; font-size:0.85rem; padding: 15px 0;">You aren\'t following anyone yet. Follow someone to share!</div>';
      return;
    }

    let sharePayload = null;
    if (type === 'post') {
      const feedRes = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
      const posts = await feedRes.json();
      const matched = posts.find(p => p.id === targetId);
      if (matched) {
        sharePayload = {
          shareType: 'post',
          postId: matched.id,
          username: matched.username,
          profilePicture: matched.profile_picture,
          mediaUrl: matched.media_url,
          caption: matched.caption
        };
      }
    } else if (type === 'profile') {
      const matched = state.users.find(u => u.username === targetId);
      if (matched) {
        sharePayload = {
          shareType: 'profile',
          username: matched.username,
          profilePicture: matched.profile_picture
        };
      }
    }

    if (!sharePayload) {
      listEl.innerHTML = '<div style="color:#ff5252; text-align:center; font-size:0.85rem;">Failed to resolve share payload.</div>';
      return;
    }

    friends.forEach(friendUsername => {
      const friendUser = state.users.find(u => u.username === friendUsername);
      if (!friendUser) return;
      
      const row = document.createElement('div');
      row.className = 'share-friend-row';
      row.innerHTML = `
        <div class="share-friend-info">
          <img src="${friendUser.profile_picture}" alt="">
          <span>@${friendUser.username}</span>
        </div>
        <button class="btn btn-primary btn-share-action" data-friend="${friendUser.username}" style="padding: 4px 12px; font-size: 0.8rem; border-radius: 6px;">Send</button>
      `;
      
      row.querySelector('.btn-share-action').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
          const recipientProfile = state.users.find(u => u.username === friendUser.username);
          if (!recipientProfile || !recipientProfile.public_key) {
            alert('Cannot share securely: recipient has not initialized E2EE keys.');
            btn.disabled = false;
            btn.textContent = 'Send';
            return;
          }
          
          const importedPubKey = await importECDHPublicKey(recipientProfile.public_key);
          const sharedKey = await deriveSharedKey(state.currentUserPrivateKey, importedPubKey);
          const encryptedPayload = await encryptData(JSON.stringify(sharePayload), sharedKey);
          
          const res = await fetch(`${API_BASE_URL}/messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: state.currentUser.username,
              receiver: friendUser.username,
              content: JSON.stringify(encryptedPayload),
              type: 'share'
            })
          });
          
          if (res.ok) {
            btn.textContent = 'Sent ✔';
            btn.style.background = '#4caf50';
            btn.style.borderColor = '#4caf50';
            playSynthSound('send');
          } else {
            btn.disabled = false;
            btn.textContent = 'Send';
          }
        } catch (err) {
          console.error(err);
          btn.disabled = false;
          btn.textContent = 'Send';
        }
      });

      listEl.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<div style="color:#ff5252; text-align:center; font-size:0.85rem;">Error loading friends.</div>';
  }
}

window.openShareLinkPost = async function(postId) {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/feed/${state.currentUser.username}`);
    const posts = await res.json();
    const post = posts.find(p => p.id === postId);
    if (post) {
      openPostLightbox(post);
    } else {
      alert('Post could not be found or has been deleted.');
    }
  } catch (err) {
    console.error(err);
  }
};

window.openShareLinkProfile = function(username) {
  loadProfile(username);
  switchTab('profile');
};

// 5. Sound Synth & Like Web Animation
function playSynthSound(type) {
  initAudioContext();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(analyserNode || audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'send') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(analyserNode || audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'like') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(500, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(analyserNode || audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

function playWebLikeAnimation(element) {
  const splash = element.querySelector('.web-splash-overlay');
  if (splash) {
    splash.classList.remove('hidden');
    splash.classList.add('animating');
    playSynthSound('like');
    setTimeout(() => {
      splash.classList.remove('animating');
      splash.classList.add('hidden');
    }, 750);
  }
}

/* ==========================================================================
   PREMIUM FEATURES IMPLEMENTATION: WEB DRAW, AUDIO VISUALIZER & SHADER FILTERS
   ========================================================================== */

// 1. Web Draw Canvas logic
function setupPremiumWebDraw() {
  if (!drawCanvas) return;
  const ctx = drawCanvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentColor = '#ff2d2d';
  let currentSize = 6;

  function initCanvas() {
    ctx.fillStyle = '#080610';
    ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
  initCanvas();

  btnWebDraw.addEventListener('click', () => {
    if (!state.activeChatPartner) {
      alert('Please select a chat thread first.');
      return;
    }
    webDrawModal.classList.remove('hidden');
    initCanvas();
    playSynthSound('click');
  });

  btnCloseDrawModal.addEventListener('click', () => {
    webDrawModal.classList.add('hidden');
    playSynthSound('click');
  });
  btnCancelDraw.addEventListener('click', () => {
    webDrawModal.classList.add('hidden');
    playSynthSound('click');
  });

  btnClearDraw.addEventListener('click', () => {
    initCanvas();
    playSynthSound('click');
  });

  function getPos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (drawCanvas.width / rect.width),
      y: (clientY - rect.top) * (drawCanvas.height / rect.height)
    };
  }

  function startDrawing(e) {
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Web Glow effect
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = currentSize * 1.5;
    
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
  }

  drawCanvas.addEventListener('mousedown', startDrawing);
  drawCanvas.addEventListener('mousemove', draw);
  drawCanvas.addEventListener('mouseup', stopDrawing);
  drawCanvas.addEventListener('mouseout', stopDrawing);

  drawCanvas.addEventListener('touchstart', startDrawing, { passive: false });
  drawCanvas.addEventListener('touchmove', draw, { passive: false });
  drawCanvas.addEventListener('touchend', stopDrawing);

  const colorBtns = webDrawModal.querySelectorAll('.color-btn');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      colorBtns.forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = 'transparent';
      });
      btn.classList.add('active');
      btn.style.borderColor = '#fff';
      currentColor = btn.getAttribute('data-color');
      playSynthSound('click');
    });
  });

  drawSizeSelect.addEventListener('change', (e) => {
    currentSize = parseInt(e.target.value, 10);
  });

  btnSendDraw.addEventListener('click', async () => {
    const dataUrl = drawCanvas.toDataURL('image/png');
    webDrawModal.classList.add('hidden');
    playSynthSound('send');
    await sendPic(dataUrl);
  });
}

// 2. Real-time Audio Visualizer
function setupPremiumVisualizer() {
  const canvas = document.getElementById('login-audio-visualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function drawFrame() {
    requestAnimationFrame(drawFrame);
    
    ctx.fillStyle = 'rgba(8, 6, 16, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);
    
    if (analyserNode && audioCtx && audioCtx.state === 'running') {
      analyserNode.getByteTimeDomainData(dataArray);
    } else {
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = 128;
      }
    }
    
    ctx.lineWidth = 2.5;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#f02fc2');
    gradient.addColorStop(0.5, '#ff2d2d');
    gradient.addColorStop(1, '#3b82f6');
    ctx.strokeStyle = gradient;
    ctx.shadowColor = 'rgba(226, 27, 27, 0.4)';
    ctx.shadowBlur = 6;
    
    ctx.beginPath();
    
    const sliceWidth = canvas.width * 1.0 / (bufferLength || 1);
    let x = 0;
    
    if (bufferLength === 0) {
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
    } else {
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  drawFrame();
}

// 3. Reels & Camera Shaders (Filters)
function setupPremiumFilters() {
  if (reelsFilterSelect) {
    reelsFilterSelect.addEventListener('change', (e) => {
      const filterType = e.target.value;
      const reelsVideos = reelsDeck.querySelectorAll('video');
      reelsVideos.forEach(video => {
        // Clear old filter classes
        video.classList.remove('filter-crimson', 'filter-venom', 'filter-noir', 'filter-cyber');
        if (filterType !== 'none') {
          video.classList.add(`filter-${filterType}`);
        }
      });
      playSynthSound('click');
    });
  }

  if (cameraFilterSelect) {
    cameraFilterSelect.addEventListener('change', (e) => {
      const filterType = e.target.value;
      const cameraPreview = document.getElementById('camera-preview');
      if (cameraPreview) {
        cameraPreview.classList.remove('filter-crimson', 'filter-venom', 'filter-noir', 'filter-cyber');
        if (filterType !== 'none') {
          cameraPreview.classList.add(`filter-${filterType}`);
        }
      }
      playSynthSound('click');
    });
  }
}

// 4. Rich Presence logic
state.userPresence = {};

function updateSelfPresence(status) {
  if (!state.currentUser) return;
  state.userPresence[state.currentUser.username] = status;
  
  // Simulate active seed user statuses
  const seeds = ['alice', 'bob', 'charlie', 'diana'];
  seeds.forEach(s => {
    if (!state.userPresence[s]) {
      state.userPresence[s] = Math.random() > 0.4 ? 'Online' : 'Offline';
    }
  });

  renderPresenceUI();
}

function renderPresenceUI() {
  if (!state.currentUser) return;
  
  // 1. Update current user indicator
  const selfStatus = state.userPresence[state.currentUser.username] || 'Online';
  const labelEl = document.getElementById('active-username');
  if (labelEl) {
    labelEl.innerHTML = `@${state.currentUser.username} <span style="font-size:0.75rem; color:#4caf50; font-weight:normal;">(${selfStatus})</span>`;
  }

  // 2. Update chat partner indicator in DMs
  if (state.activeChatPartner) {
    const partnerStatus = state.userPresence[state.activeChatPartner.username] || 'Online';
    const partnerBioEl = document.getElementById('chat-partner-bio');
    if (partnerBioEl) {
      partnerBioEl.innerHTML = `${state.activeChatPartner.bio} &bull; <span style="color:#4caf50; font-weight:600;">${partnerStatus}</span>`;
    }
  }
}

// Window load trigger
window.addEventListener('load', init);
