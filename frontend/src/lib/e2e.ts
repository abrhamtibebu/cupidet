/**
 * End-to-end encryption for chat messages.
 *
 * Each user has an ECDH P-256 keypair. The private key never leaves this
 * device (localStorage); only the public key is uploaded to the server.
 * For every match the two clients derive the same AES-GCM key from
 * ECDH(myPrivate, theirPublic) — the server only ever stores ciphertext.
 *
 * Envelope format: `enc1:<base64 iv>:<base64 ciphertext>`
 */
import { api } from './api'

const PRIV_KEY = 'cupid_e2e_priv'
const PUB_KEY = 'cupid_e2e_pub'
const UPLOADED_KEY = 'cupid_e2e_uploaded'
const PREFIX = 'enc1:'

export const ENCRYPTED_PLACEHOLDER = '🔒 Encrypted message'

let keyPairPromise: Promise<{ privateJwk: JsonWebKey; publicJwkString: string } | null> | null = null
const sharedKeyCache = new Map<string, Promise<CryptoKey | null>>()

export function isEncryptedBody(body: string | null | undefined): boolean {
  return typeof body === 'string' && body.startsWith(PREFIX)
}

function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

function b64encode(buf: ArrayBuffer): string {
  let out = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i])
  return btoa(out)
}

function b64decode(str: string): Uint8Array<ArrayBuffer> {
  const bin = atob(str)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function loadOrCreateKeyPair(): Promise<{ privateJwk: JsonWebKey; publicJwkString: string } | null> {
  if (!cryptoAvailable()) return null

  const storedPriv = localStorage.getItem(PRIV_KEY)
  const storedPub = localStorage.getItem(PUB_KEY)
  if (storedPriv && storedPub) {
    try {
      return { privateJwk: JSON.parse(storedPriv) as JsonWebKey, publicJwkString: storedPub }
    } catch {
      /* regenerate below */
    }
  }

  try {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey'],
    )
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
    const publicJwkString = JSON.stringify(publicJwk)
    localStorage.setItem(PRIV_KEY, JSON.stringify(privateJwk))
    localStorage.setItem(PUB_KEY, publicJwkString)
    localStorage.removeItem(UPLOADED_KEY)
    return { privateJwk, publicJwkString }
  } catch {
    return null
  }
}

function getKeyPair() {
  if (!keyPairPromise) keyPairPromise = loadOrCreateKeyPair()
  return keyPairPromise
}

/** Ensure this device has a keypair and the server knows our public key. Call after sign-in. */
export async function syncE2eKeys(): Promise<void> {
  const pair = await getKeyPair()
  if (!pair) return
  if (localStorage.getItem(UPLOADED_KEY) === pair.publicJwkString) return
  try {
    await api.uploadE2eKey(pair.publicJwkString)
    localStorage.setItem(UPLOADED_KEY, pair.publicJwkString)
  } catch {
    /* retried on next launch */
  }
}

async function deriveSharedKey(peerPublicJwkString: string): Promise<CryptoKey | null> {
  const cached = sharedKeyCache.get(peerPublicJwkString)
  if (cached) return cached

  const promise = (async () => {
    const pair = await getKeyPair()
    if (!pair) return null
    try {
      const myPrivate = await crypto.subtle.importKey(
        'jwk',
        pair.privateJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey'],
      )
      const theirPublic = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(peerPublicJwkString) as JsonWebKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        [],
      )
      return await crypto.subtle.deriveKey(
        { name: 'ECDH', public: theirPublic },
        myPrivate,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )
    } catch {
      return null
    }
  })()

  sharedKeyCache.set(peerPublicJwkString, promise)
  return promise
}

/** Encrypt plaintext for a peer. Returns null when encryption isn't possible (send plaintext). */
export async function encryptForPeer(peerPublicJwkString: string | null | undefined, text: string): Promise<string | null> {
  if (!peerPublicJwkString || !cryptoAvailable()) return null
  const key = await deriveSharedKey(peerPublicJwkString)
  if (!key) return null
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(text),
    )
    return `${PREFIX}${b64encode(iv.buffer)}:${b64encode(ct)}`
  } catch {
    return null
  }
}

/** Decrypt an `enc1:` envelope from a peer. Returns null when it can't be decrypted. */
export async function decryptFromPeer(peerPublicJwkString: string | null | undefined, body: string): Promise<string | null> {
  if (!isEncryptedBody(body) || !peerPublicJwkString || !cryptoAvailable()) return null
  const key = await deriveSharedKey(peerPublicJwkString)
  if (!key) return null
  try {
    const [ivB64, ctB64] = body.slice(PREFIX.length).split(':')
    if (!ivB64 || !ctB64) return null
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(ivB64) },
      key,
      b64decode(ctB64),
    )
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}
