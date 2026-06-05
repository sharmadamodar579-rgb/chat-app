class CryptoProvider {
  async deriveMasterKey(passphrase, salt = null) { throw new Error('Not implemented'); }
  async deriveAuthHash(masterKey) { throw new Error('Not implemented'); }
  async generateDEK() { throw new Error('Not implemented'); }
  async wrapDEK(dek, masterKey) { throw new Error('Not implemented'); }
  async unwrapDEK(wrappedDek, iv, masterKey) { throw new Error('Not implemented'); }
  async encrypt(plaintext, dek) { throw new Error('Not implemented'); }
  async decrypt(ciphertext, iv, dek) { throw new Error('Not implemented'); }
  
  _base64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  _fromBase64(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
  _hexEncode(buf) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); }
}

class WebCryptoProvider extends CryptoProvider {
  async deriveMasterKey(passphrase, salt = null) {
    const enc = new TextEncoder();
    const rawSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const masterKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: rawSalt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
    return { masterKey, salt: rawSalt };
  }

  async deriveAuthHash(masterKey) {
    const raw = await crypto.subtle.exportKey('raw', masterKey);
    const hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode('auth-verification'));
    return this._hexEncode(sig);
  }

  async generateDEK() {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }

  async wrapDEK(dek, masterKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedBuf = await crypto.subtle.wrapKey('raw', dek, masterKey, { name: 'AES-GCM', iv });
    return { wrappedDek: this._base64(wrappedBuf), iv: this._base64(iv) };
  }

  async unwrapDEK(wrappedDek, iv, masterKey) {
    return crypto.subtle.unwrapKey(
      'raw', this._fromBase64(wrappedDek), masterKey,
      { name: 'AES-GCM', iv: this._fromBase64(iv) },
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext, dek) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, encoded);
    return { ciphertext: this._base64(ciphertextBuf), iv: this._base64(iv) };
  }

  async decrypt(ciphertext, iv, dek) {
    const plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this._fromBase64(iv) }, dek, this._fromBase64(ciphertext)
    );
    return new TextDecoder().decode(plaintextBuf);
  }
}

class AndroidCryptoProvider extends CryptoProvider {
  async deriveMasterKey(passphrase, salt = null) { throw new Error('AndroidCryptoProvider.deriveMasterKey not yet implemented'); }
  async deriveAuthHash(masterKey) { throw new Error('AndroidCryptoProvider.deriveAuthHash not yet implemented'); }
  async generateDEK() { throw new Error('AndroidCryptoProvider.generateDEK not yet implemented'); }
  async wrapDEK(dek, masterKey) { throw new Error('AndroidCryptoProvider.wrapDEK not yet implemented'); }
  async unwrapDEK(wrappedDek, iv, masterKey) { throw new Error('AndroidCryptoProvider.unwrapDEK not yet implemented'); }
  async encrypt(plaintext, dek) { throw new Error('AndroidCryptoProvider.encrypt not yet implemented'); }
  async decrypt(ciphertext, iv, dek) { throw new Error('AndroidCryptoProvider.decrypt not yet implemented'); }
}
