// pages/api/hls-key.js
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const video = req.query.video;
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1] || req.query.token;

  if (!token) {
    return res.status(401).send('Missing token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.video !== video) {
      return res.status(403).send('Token-video mismatch');
    }
  } catch (err) {
    console.error('JWT error:', err.message);
    return res.status(401).send('Invalid token');
  }

  const keyPath = path.join(process.cwd(), 'keys', `${video}.key`);
  if (!fs.existsSync(keyPath)) {
    return res.status(404).send('Key not found');
  }

  const key = fs.readFileSync(keyPath);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(key);
}
