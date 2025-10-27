// pages/success.js
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Success() {
  const router = useRouter()
  const { session_id } = router.query

  return (
    <div style={{ padding: 40 }}>
      <h1>Payment Successful (Fake) ✅</h1>
      <p>Your fake payment was accepted. Click below to open the secure player.</p>

      {/* ✅ FIX: remove <a> tag inside Link */}
      <Link
        href={`/watch?session_id=${session_id || ''}`}
        style={{
          display: 'inline-block',
          padding: '12px 18px',
          background: '#0b74de',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          marginTop: 20,
          fontWeight: 'bold',
        }}
      >
        Open Secure Player
      </Link>
    </div>
  )
}
