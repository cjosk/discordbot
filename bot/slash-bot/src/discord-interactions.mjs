const encoder = new TextEncoder();
const publicKeyCache = new Map();

const hexToBytes = (hex) => {
  if (!hex || hex.length % 2 !== 0) {
    throw new Error('Invalid hex value.');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
};

const getImportedPublicKey = async (publicKeyHex) => {
  if (!publicKeyCache.has(publicKeyHex)) {
    const promise = crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKeyHex),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    publicKeyCache.set(publicKeyHex, promise);
  }

  return publicKeyCache.get(publicKeyHex);
};

export const verifyDiscordRequest = async (request, publicKeyHex) => {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');

  if (!signature || !timestamp || !publicKeyHex) {
    return { isValid: false, body: '' };
  }

  const body = await request.text();
  const key = await getImportedPublicKey(publicKeyHex);
  const isValid = await crypto.subtle.verify(
    'Ed25519',
    key,
    hexToBytes(signature),
    encoder.encode(`${timestamp}${body}`),
  );

  return { isValid, body };
};
