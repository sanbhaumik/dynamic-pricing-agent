const FLAGS = { us: '🇺🇸', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', ca: '🇨🇦', au: '🇦🇺' }

export default function Header({ mode, productName, markets, loading, onRunAnalysis, onOpenHistory }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 56,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 90,
    }}>

      {/* Left: wordmark + mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: 'var(--text-primary)',
        }}>
          PricingAgent
        </span>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`dot ${mode === 'live' ? 'dot-live' : 'dot-demo'}`} />
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: mode === 'live' ? 'var(--accent-success)' : 'var(--accent-warning)',
          }}>
            {mode === 'live' ? 'Live' : 'Demo'}
          </span>
        </div>
      </div>

      {/* Centre: product + markets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
        {productName && (
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{productName}</span>
        )}
        {productName && markets?.length > 0 && (
          <span style={{ color: 'var(--border)', fontSize: 16 }}>·</span>
        )}
        {markets?.length > 0 && (
          <span style={{ letterSpacing: '0.12em' }}>
            {markets.map((m) => FLAGS[m] || m.toUpperCase()).join('  ')}
          </span>
        )}
      </div>

      {/* Right: history + run */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onOpenHistory} style={{ fontSize: 12 }}>
          History
        </button>
        <button
          className="btn btn-primary"
          onClick={onRunAnalysis}
          disabled={loading}
          style={{ minWidth: 130, fontSize: 13 }}
        >
          {loading ? (
            <><span className="spinner" /> Analysing</>
          ) : (
            'Run Analysis'
          )}
        </button>
      </div>
    </div>
  )
}
