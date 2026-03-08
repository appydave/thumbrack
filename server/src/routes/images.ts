import { Router } from 'express';
import { extname } from 'node:path';
import { apiFailure } from '../helpers/response.js';

const router = Router();

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

router.get('/:encodedPath', (req, res) => {
  const { encodedPath } = req.params;

  let absolutePath: string;
  try {
    absolutePath = Buffer.from(encodedPath, 'base64url').toString('utf8');
  } catch {
    apiFailure(res, 'Invalid encoded path', 400);
    return;
  }

  const ext = extname(absolutePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    apiFailure(res, `File extension not allowed: ${ext || '(none)'}`, 400);
    return;
  }

  res.sendFile(absolutePath, (err) => {
    if (err) {
      apiFailure(res, `File not found: ${absolutePath}`, 404);
    }
  });
});

export default router;
