// pages/index.js
import Head from 'next/head'
import { getDeviceId } from '../utils/device'

export default function Home() {
  async function buy() {
    const deviceId = getDeviceId() || 'unknown_device'
    const res = await fetch('/api/create-fake-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: 'video1', deviceId, userId: 'user_test' })
    })
    const j = await res.json()
    if (j && j.url) {
      window.location = j.url
    } else {
      alert('Failed to create session')
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <Head><title>Secure Video — Fake Checkout</title></Head>
      <h1>Secure Video — Fake Checkout</h1>
      <p>This is a local test flow. Click Buy to simulate payment.</p>
      <button onClick={buy} style={{ padding: '12px 18px', fontSize: 16 }}>Buy & Watch (Fake)</button>
      <p style={{ marginTop: 20 }}>After “payment” you will be redirected to a success page and then to the secure player.</p>
    </div>
  )
}
