import { useEffect, useState } from 'react';
import { useEngineStore } from '../store';
import { initEngine, setProgressCallback } from '../lib/pyodideEngine';

export function EngineLoader({ children }) {
  const { ready, loading, progress, statusMsg, error, setLoading, setReady, setProgress, setError } = useEngineStore();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    setLoading(true);

    setProgressCallback((pct, msg) => {
      setProgress(pct, msg);
    });

    initEngine()
      .then(() => setReady())
      .catch((err) => setError(err.message || 'Failed to load engine'));
  }, []);

  if (ready) return children;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--page-bg)',
      flexDirection: 'column', gap: '1.5rem', padding: '2rem',
    }}>
      {/* Logo */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text)' }}>
        Financials<span style={{ color: 'var(--blue)' }}> Projector</span>
      </div>

      {error ? (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--radius)', padding: '1rem 1.5rem',
          color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
          maxWidth: 480, textAlign: 'center',
        }}>
          <strong>Engine failed to load</strong><br />
          {error}<br />
          <button
            style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', cursor: 'pointer', borderRadius: 4, border: '1px solid var(--red)', background: 'none', color: 'var(--red)' }}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div style={{ width: 360, background: 'var(--border)', borderRadius: 99, height: 6 }}>
            <div style={{
              height: 6, borderRadius: 99, background: 'var(--blue)',
              width: `${progress}%`, transition: 'width 0.4s ease',
            }} />
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
            color: 'var(--text-3)', textAlign: 'center',
          }}>
            {statusMsg}
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', maxWidth: 320, textAlign: 'center' }}>
            Loading the financial calculation engine into your browser.
            This takes ~15 seconds on first visit, then loads instantly from cache.
          </div>
        </>
      )}
    </div>
  );
}
