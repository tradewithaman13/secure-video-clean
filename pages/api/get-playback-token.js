// pages/api/get-playback-token.js
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req, res) {
  const videoId = 'video1';

  // Create JWT token valid for 1 hour
  const token = jwt.sign({ video: videoId }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const playback = {
    provider: 'local',
    token,
    playback: {
      videoId,
      playlistUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/protected_hls/${videoId}/out.m3u8`
    }
  };

  res.status(200).json(playback);
}
