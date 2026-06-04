# Proposed Cryptographic Architecture & First MVP Step

This document outlines the cryptographic schema, key derivation model, and folder structure for the first step of building the **Secure AI App** in `D:\caht app\chatapp`.

---

## 1. Cryptographic Design System

The core privacy rule is: **Clients own the plaintext; the server only stores and syncs ciphertext.**

### Key Derivation Flow (Client-Side)

```text
[User Password] + [KDF Salt]
        │
        ▼ (PBKDF2-HMAC-SHA256, 100,000 iterations)
   [Master Key] (256-bit)
        │
        ├─► [DEK Encryption Key] ──► Encrypts the random DEK (Key Wrapping)
        │
        └─► [Auth Hash] (derived via HMAC-SHA256(Master Key, "auth-verification"))
                 │
                 ▼ (Sent to server for authentication)
            [Server bcrypt hash] ──► Stored in Database
```

1. **Master Key**: Derived locally using PBKDF2 with SHA-256 and a random 16-byte salt unique to the user.
2. **Auth Hash**: Sent to the server for authentication (registration/login). The server hashes this values with `bcrypt` before storing. This ensures the server never sees the raw password or the master encryption key.
3. **Data Encryption Key (DEK)**: A cryptographically secure random 256-bit AES key.
   - All client data is encrypted with the DEK using **AES-GCM (256-bit)**.
   - The DEK is encrypted (wrapped) with the `Master Key` using **AES-GCM** and stored on the server.
   - When a new device is registered and approved, it retrieves the wrapped DEK, decrypts it using the derived `Master Key`, and can then decrypt all synced sync payloads.

### Encrypted Sync Payload Format

Every synced object (e.g. note or task) is stored in the database using this JSON schema:

```json
{
  "id": "uuid-v4-string",
  "type": "note",
  "ciphertext": "base64-encoded-aes-gcm-encrypted-string",
  "iv": "base64-encoded-12-byte-initialization-vector",
  "tag": "base64-encoded-16-byte-authentication-tag",
  "updated_at": "iso-timestamp-string"
}
```

---

## 2. Proposed Project Layout

We will organize the `D:\caht app\chatapp` directory as follows:

```text
D:\caht app\chatapp/
├── backend/                  # Node.js/Express SQLite backend APIs
│   ├── server.js             # Main server script
│   ├── database.js           # SQLite setup and queries
│   └── package.json          # Backend dependencies (express, sqlite3, bcrypt, cors)
│
├── frontend-web/             # Web client using vanilla JS and Web Crypto API
│   ├── index.html            # Web entrypoint (Login, Vault Dashboard)
│   ├── style.css             # Cyberpunk/glassmorphism design theme
│   ├── crypto.js             # Client-side cryptographic helper operations
│   └── app.js                # Frontend controller logic and REST syncing
│
├── ANTIGRAVITY_HANDOFF.md    # Collaboration status handoff (don't delete)
└── README.md                 # Project MVP priorities
```

---

## 3. First Implementation Step: Auth & Key Exchange Sandbox

We propose building the **Auth & Key Exchange Sandbox** as our immediate first step:
1. Initialize the backend workspace with `npm init` and install light SQLite + Express server dependencies.
2. Create the frontend client cryptographic helpers (`crypto.js`) executing:
   - Key derivation from passphrase (`PBKDF2`).
   - Generation of random 256-bit `DEK`.
   - Wrapping/Unwrapping the `DEK` with derived `Master Key`.
3. Create user registration and login endpoints on the backend that accept the `Auth Hash` and store the user record along with the wrapped `DEK`.

---

## Risks and Security Assumptions
- **Entropy Warning**: The user's master passphrase must be strong. Weak passwords will expose derived keys to brute-force attacks if the server's database is ever leaked.
- **HTTPS Necessity**: While keys are derived client-side, the `Auth Hash` is sent to the server. HTTPS is mandatory in production to prevent man-in-the-middle interception of authentication requests.
