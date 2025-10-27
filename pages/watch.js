// pages/watch.js
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

/**
 * Simple JWT payload decoder (no verification) to read "exp".
 * Works for typical JWTs: header.payload.signature
 */
function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export default function Watch() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playback, setPlayback] = useState(null); // { token, playback:{ playlistUrl, videoId } }

  // Fetch a new token from server
  async function fetchPlaybackToken() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/get-playback-token');
      if (!res.ok) {
        throw new Error(`Token request failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setPlayback(data);
      scheduleRefresh(data.token);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('fetchPlaybackToken error', err);
      setError(err.message || 'Failed to get playback token');
      setLoading(false);
      throw err;
    }
  }

  // Schedule a refresh slightly before token expiry
  function scheduleRefresh(token) {
    try {
      const payload = parseJwtPayload(token);
      if (!payload || !payload.exp) return;
      const now = Math.floor(Date.now() / 1000);
      const ttl = payload.exp - now;
      // Refresh 45 seconds before expiry or half of ttl if small
      const refreshIn = Math.max(5000, (Math.max(5, Math.floor(ttl - 45)) * 1000));
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const data = await fetchPlaybackToken();
          // If we have an Hls instance, reattach headers by reloading source
          if (hlsRef.current && data?.playback?.playlistUrl) {
            // reload to ensure new token used for subsequent key requests
            hlsRef.current.stopLoad();
            hlsRef.current.loadSource(data.playback.playlistUrl);
            hlsRef.current.startLoad();
          }
        } catch (_) {
          // ignore - fetchPlaybackToken already set error state
        }
      }, refreshIn);
    } catch (e) {
      // ignore scheduling errors
    }
  }

  // (Re)initialize HLS with the given token + playlistUrl
  function initHls(token, playlistUrl) {
    // cleanup old instance if present
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: function (xhr, url) {
          // Attach Authorization header for key requests only
          // (key endpoint in your project is /api/hls-key)
          if (url && url.includes('/api/hls-key')) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        },
        // optional: tune buffer size, maxBufferLength etc. for production
      });

      hlsRef.current = hls;

      // Network / key error handling: if key load returns 401, try refresh
      hls.on(Hls.Events.ERROR, async (event, data) => {
        console.warn('Hls error', data);
        // network error and response code available
        const is401 = data?.response?.code === 401 || data?.details === 'keyLoadError';
        const isFatal = data?.fatal === true;

        if (is401) {
          // Attempt to refresh token and reload source once
          try {
            const newData = await fetchPlaybackToken();
            // force reload with new token
            hls.stopLoad();
            hls.loadSource(newData.playback.playlistUrl);
            hls.startLoad();
            setError(null);
            return;
          } catch (err) {
            setError('Authorization failed while fetching key. Please refresh the page.');
            hls.stopLoad();
            return;
          }
        }

        if (isFatal) {
          setError('Playback error. Try reloading the page.');
          try {
            hls.destroy();
          } catch (e) {}
          hlsRef.current = null;
        }
      });

      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        try {
          hls.loadSource(playlistUrl);
        } catch (e) {
          console.error('loadSource error', e);
          setError('Failed to load stream.');
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // auto-play or just show controls—browser may block autoplay
        video.play().catch(() => {
          // autoplay may be blocked; that's ok.
        });
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS: we can't set custom headers for key requests
      // so ensure key endpoint accepts token via query param: /api/hls-key?video=...&token=...
      video.src = playlistUrl;
      video.addEventListener('error', () => {
        setError('Native HLS playback error (Safari).');
      });
    } else {
      setError('HLS not supported in this browser.');
    }
  }

  // Initialize player on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPlaybackToken();
        if (!mounted) return;
        const token = data.token;
        const playlistUrl = data.playback.playlistUrl;
        initHls(token, playlistUrl);
      } catch (err) {
        // error state already set
      }
    })();

    // cleanup on unmount
    return () => {
      mounted = false;
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {}
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // manual retry button handler
  async function handleRetry() {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchPlaybackToken();
      setPlayback(data);
      initHls(data.token, data.playback.playlistUrl);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 900, textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
              pointerEvents: 'none'
            }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: 12, borderRadius: 8 }}>
                Loading player...
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            controls
            width="900"
            style={{ background: '#000' }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 12, color: '#b00020' }}>
            <div style={{ marginBottom: 8 }}>{error}</div>
            <button onClick={handleRetry} style={{ padding: '8px 12px' }}>Retry</button>
          </div>
        )}

        {!error && !loading && (
          <div style={{ marginTop: 10, color: '#666' }}>
            Encrypted HLS playback — token-protected
          </div>
        )}
      </div>
    </div>
  );
}
