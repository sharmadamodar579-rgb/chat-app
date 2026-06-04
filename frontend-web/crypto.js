// Helper: Convert ArrayBuffer to Base64 string
function bufToBase64(buf) {
  const binary = String.fromCharCode.apply(null, new Uint8Array(buf));
  return btoa(binary);
}

// Helper: Convert Base64 string to ArrayBuffer
function base64ToBuf(b64) {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Convert ArrayBuffer to Hex string
function bufToHex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Helper: Convert Hex string to ArrayBuffer
function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit Master Key from password + username (acting as salt) using PBKDF2-HMAC-SHA256
 */
async function deriveMasterKey(password, username) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  // Normalize and use username as salt. Since username is unique, this makes key derivation deterministic.
  const saltBytes = encoder.encode(username.toLowerCase().trim());

  // Import raw password bytes as a PBKDF2 key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive raw bits
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256 // 256 bits = 32 bytes
  );

  return new Uint8Array(derivedBits);
}

/**
 * Derives the Auth Hash sent to the server for authentication
 * Auth Hash = HMAC-SHA256(MasterKey, "auth-verification")
 */
async function deriveAuthHash(masterKeyBytes) {
  const encoder = new TextEncoder();
  const authMessageBytes = encoder.encode('auth-verification');

  // Import master key bytes for HMAC
  const hmacKey = await window.crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign message to generate hash
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    hmacKey,
    authMessageBytes
  );

  return bufToHex(signature);
}

/**
 * Generates a random 256-bit AES-GCM Data Encryption Key (DEK)
 */
async function generateDEK() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts (wraps) the DEK using the Master Key (AES-GCM)
 * Returns a JSON string of { ciphertext, iv, tag }
 */
async function wrapDEK(dekKey, masterKeyBytes) {
  // Export DEK to raw bytes
  const dekBytes = await window.crypto.subtle.exportKey('raw', dekKey);

  // Import Master Key as AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate 12-byte IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    aesKey,
    dekBytes
  );

  // Web Crypto appends a 16-byte authentication tag at the end of the encrypted buffer.
  // We split the tag and ciphertext to match our sync layout.
  const encryptedBytes = new Uint8Array(encrypted);
  const tagLength = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLength);

  return JSON.stringify({
    ciphertext: bufToBase64(ciphertextBytes),
    iv: bufToBase64(iv),
    tag: bufToBase64(tagBytes)
  });
}

/**
 * Decrypts (unwraps) the DEK using the Master Key (AES-GCM)
 * Returns the decrypted DEK as a CryptoKey
 */
async function unwrapDEK(wrappedKeyJsonStr, masterKeyBytes) {
  const { ciphertext, iv, tag } = JSON.parse(wrappedKeyJsonStr);

  const ciphertextBytes = new Uint8Array(base64ToBuf(ciphertext));
  const ivBytes = new Uint8Array(base64ToBuf(iv));
  const tagBytes = new Uint8Array(base64ToBuf(tag));

  // Combine ciphertext and tag for Web Crypto Subtle decryption
  const combined = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);

  // Import Master Key as AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt raw DEK bytes
  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    aesKey,
    combined
  );

  // Import back as CryptoKey
  return await window.crypto.subtle.importKey(
    'raw',
    decryptedBytes,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plain text using the DEK (AES-GCM)
 * Returns object: { ciphertext, iv, tag }
 */
async function encryptData(plaintext, dekKey) {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(plaintext);

  // Generate 12-byte IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    dekKey,
    dataBytes
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const tagLength = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLength);

  return {
    ciphertext: bufToBase64(ciphertextBytes),
    iv: bufToBase64(iv),
    tag: bufToBase64(tagBytes)
  };
}

/**
 * Decrypts E2EE payload using the DEK (AES-GCM)
 * Returns decrypted plaintext string
 */
async function decryptData(ciphertext, iv, tag, dekKey) {
  const ciphertextBytes = new Uint8Array(base64ToBuf(ciphertext));
  const ivBytes = new Uint8Array(base64ToBuf(iv));
  const tagBytes = new Uint8Array(base64ToBuf(tag));

  // Combine ciphertext and tag
  const combined = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);

  // Decrypt
  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    dekKey,
    combined
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}

/**
 * Generates an ECDH P-256 Key Pair for End-to-End Encryption
 */
async function generateECDHKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true, // extractable (so we can export raw/pkcs8)
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Exports an ECDH Public Key to a Base64 string
 */
async function exportECDHPublicKey(publicKey) {
  const raw = await window.crypto.subtle.exportKey('raw', publicKey);
  return bufToBase64(raw);
}

/**
 * Imports an ECDH Public Key from a Base64 string
 */
async function importECDHPublicKey(pubBase64) {
  const raw = base64ToBuf(pubBase64);
  return await window.crypto.subtle.importKey(
    'raw',
    raw,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

/**
 * Encrypts (wraps) the ECDH Private Key using the derived Master Key
 * Returns a JSON string of { ciphertext, iv, tag }
 */
async function wrapPrivateKey(privateKey, masterKeyBytes) {
  // Export private key to pkcs8
  const privBytes = await window.crypto.subtle.exportKey('pkcs8', privateKey);

  // Import Master Key as AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate random 12-byte IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    aesKey,
    privBytes
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const tagLength = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLength);

  return JSON.stringify({
    ciphertext: bufToBase64(ciphertextBytes),
    iv: bufToBase64(iv),
    tag: bufToBase64(tagBytes)
  });
}

/**
 * Decrypts (unwraps) the ECDH Private Key using the derived Master Key
 * Returns the decrypted Private Key as a CryptoKey
 */
async function unwrapPrivateKey(wrappedKeyJsonStr, masterKeyBytes) {
  const { ciphertext, iv, tag } = JSON.parse(wrappedKeyJsonStr);

  const ciphertextBytes = new Uint8Array(base64ToBuf(ciphertext));
  const ivBytes = new Uint8Array(base64ToBuf(iv));
  const tagBytes = new Uint8Array(base64ToBuf(tag));

  // Combine ciphertext and tag
  const combined = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);

  // Import Master Key as AES-GCM key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt raw pkcs8 bytes
  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    aesKey,
    combined
  );

  // Import back as ECDH private CryptoKey
  return await window.crypto.subtle.importKey(
    'pkcs8',
    decryptedBytes,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derives a shared 256-bit AES-GCM Symmetric Key from own ECDH private key and other user's public key
 */
async function deriveSharedKey(ownPrivateKey, otherPublicKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: otherPublicKey
    },
    ownPrivateKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives the Admin's Master Key from a static pin and username 'admin'.
 * This is used for escrow wrapping/unwrapping.
 */
async function deriveAdminMasterKey() {
  // We use the static pin 'pg-admin-escrow-pin' and 'admin' as username (salt).
  return await deriveMasterKey('pg-admin-escrow-pin', 'admin');
}

