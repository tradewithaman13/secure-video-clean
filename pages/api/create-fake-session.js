// pages/api/create-fake-session.js
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { videoId, deviceId, userId } = req.body || {}
    // create a fake session id and return a redirect URL to the success page
    const fakeSessionId = 'fake_' + uuidv4()
    // Optionally store in a simple file/DB if you want to later validate; for now we just return URL
    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${YOUR_DOMAIN}/success?session_id=${encodeURIComponent(fakeSessionId)}`
    return res.json({ url: successUrl, session_id: fakeSessionId })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
