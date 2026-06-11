const FLAGS = { us: '🇺🇸', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', ca: '🇨🇦', au: '🇦🇺' }

function timeAgo(ts) {
  if (!ts) return null
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function StatusBar({ mode, lastAnalysis, markets, loading }) {
  const lastStr = timeAgo(lastAnalysis)

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 32,
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      fontSize: 11,
      color: 'var(--text-muted)',
      zIndex: 70,
      gap: 16,
    }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className={`dot ${mode === 'live' ? 'dot-live' : 'dot-demo'}`} />
          <span>{mode === 'live' ? 'Live mode' : 'Demo mode'}</span>
        </div>
        {lastStr && (
          <>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Last run {lastStr}</span>
          </>
        )}
        {loading && (
          <>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ color: 'var(--accent-primary)' }}>Fetching data...</span>
          </>
        )}
      </div>

      {/* Centre: markets */}
      <div style={{ letterSpacing: '0.1em' }}>
        {(markets || []).map((m) => FLAGS[m] || m.toUpperCase()).join('  ')}
      </div>

      {/* Right */}
      <div>
        Powered by{' '}
        <a
          href="https://brightdata.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          Bright Data
        </a>
        {' + '}
        <a
          href="https://anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          Claude
        </a>
      </div>
    </div>
  )
}
