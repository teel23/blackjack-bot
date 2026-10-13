'use client';

// Last-resort boundary (the root layout itself failed). Plain HTML, no app state.
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ background: '#0a100e', color: '#eef4f1', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22 }}>Blackjack Bot hit a snag</h1>
          <p style={{ color: '#9fb3ab' }}>Your saved progress is stored on this device and is safe.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 24, minHeight: 48, padding: '0 24px', borderRadius: 16, border: 0, background: '#f4c55b', fontWeight: 700, fontSize: 16 }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
