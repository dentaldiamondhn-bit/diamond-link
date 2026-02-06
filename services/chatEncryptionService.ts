// HIPAA Chat Encryption - AES-256-GCM + RSA-OAEP
export class ChatEncryptionService {
  // Generate message key
  static async generateMessageKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate RSA key pair
  static async generateUserKeyPair() {
    return await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt message
  static async encryptMessage(content: string, publicKeys: CryptoKey[]) {
    const key = await this.generateMessageKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(content)
    );

    const encryptedKeys = await Promise.all(
      publicKeys.map(async pubKey =>
        crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          pubKey,
          await crypto.subtle.exportKey('raw', key)
        )
      )
    );

    return {
      encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      encryptedKeys: encryptedKeys.map(k => btoa(String.fromCharCode(...new Uint8Array(k)))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  // Decrypt message
  static async decryptMessage(
    encryptedContent: string,
    encryptedKey: string,
    iv: string,
    privateKey: CryptoKey
  ): Promise<string> {
    const keyBuffer = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
    );

    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)) },
      key,
      Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0))
    );

    return new TextDecoder().decode(decrypted);
  }
}
