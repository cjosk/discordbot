import crypto from 'node:crypto';

import { authenticateRequest } from './_auth.js';
import { HttpError } from './_error.js';
import { enforceUserRateLimit } from './_rateLimit.js';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_UPLOAD_FOLDER = 'supremacybank/proofs';
const CLOUDINARY_ALLOWED_FORMATS = 'jpg,jpeg,png,webp';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const auth = await authenticateRequest(req);
    await enforceUserRateLimit(req, auth.user.id, {
      scope: 'upload-signature',
      limit: 12,
      windowMs: 60_000,
      message: 'Upload signature rate limit exceeded. Please wait a minute.',
    });

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new HttpError(500, 'Cloudinary env vars are not configured.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = CLOUDINARY_UPLOAD_FOLDER;
    const allowedFormats = CLOUDINARY_ALLOWED_FORMATS;
    const signature = crypto
      .createHash('sha1')
      .update(`allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
      .digest('hex');

    return res.status(200).json({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      folder,
      allowedFormats,
      timestamp,
      signature,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Unexpected upload signature error.' });
  }
}
