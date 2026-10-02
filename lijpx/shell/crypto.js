// Decrypts the AES-256-GCM envelopes written by build/crypto.py. The key is derived once with
// PBKDF2-HMAC-SHA256, kept as a non-extractable CryptoKey in memory, and never stored.

const FORMAT = { v: 1, kdf: 'PBKDF2-SHA256', iter: 600000 };
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const CHECK_PLAINTEXT = 'lijpx-hub';

function bytes(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

// Fetches an envelope and checks its format, so a broken file fails here with a message rather
// than inside the key derivation or the decryption.
export async function fetchEnvelope(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const envelope = await response.json();
  let sizes = null;
  try {
    sizes = [bytes(envelope.salt).length, bytes(envelope.iv).length, bytes(envelope.ct).length];
  } catch {
    // not base64; reported below
  }
  if (envelope.v !== FORMAT.v || envelope.kdf !== FORMAT.kdf || envelope.iter !== FORMAT.iter
    || !sizes || sizes[0] !== SALT_BYTES || sizes[1] !== IV_BYTES || sizes[2] <= TAG_BYTES) {
    throw new Error(`${url} is not in the expected format; rebuild the site`);
  }
  return envelope;
}

// Returns the key when the password opens check.enc, or null when it does not.
export async function unlock(password, checkEnvelope) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: bytes(checkEnvelope.salt), iterations: checkEnvelope.iter },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  try {
    return (await decryptText(key, checkEnvelope)) === CHECK_PLAINTEXT ? key : null;
  } catch {
    return null; // AES-GCM refuses to decrypt with the wrong key
  }
}

export async function decryptText(key, envelope) {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(envelope.iv) }, key, bytes(envelope.ct));
  return new TextDecoder().decode(plaintext);
}
