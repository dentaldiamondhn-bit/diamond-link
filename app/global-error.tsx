'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    try {
      console.error('[GlobalError]', error, error.stack)
    } catch {}
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ marginBottom: '1rem' }}>An unexpected error occurred.</p>
          {error?.message && (
            <pre
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: '#f1f5f9',
                color: '#7f1d1d',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                textAlign: 'left',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {'\n\n'}
              {error.digest ? `Digest: ${error.digest}\n\n` : ''}
              {error.stack || ''}
            </pre>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              background: '#14b8a6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
