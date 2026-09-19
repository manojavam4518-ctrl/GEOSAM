const SECRET_KEY = process.env.SESSION_SECRET || 'fallback-secret-for-geotransit-123456';

async function getCryptoKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(payload: {
  userId: string;
  email: string;
  role: string;
  sessionToken: string;
}): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Return payload Base64 + "." + signatureHex
  const payloadBase64 = btoa(unescape(encodeURIComponent(data)));
  return `${payloadBase64}.${signatureHex}`;
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; email: string; role: string; sessionToken: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadBase64, signatureHex] = parts;
    const dataStr = decodeURIComponent(escape(atob(payloadBase64)));
    const payload = JSON.parse(dataStr);

    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    const key = await getCryptoKey();
    const encoder = new TextEncoder();
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array(
        signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      ),
      encoder.encode(dataStr)
    );

    return verified ? payload : null;
  } catch (e) {
    return null;
  }
}
