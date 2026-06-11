export default function DemoBanner({ onDismiss }) {
  return (
    <div style={{
      height: 40,
      background: 'rgba(245,158,11,0.08)',
      borderBottom: '1px solid rgba(245,158,11,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      fontSize: 12,
      flexShrink: 0,
      zIndex: 100,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="badge badge-demo">Demo</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          You're viewing sample data — no live API calls are being made
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <a
          href="https://brightdata.com/products/serp-api"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 12,
          }}
        >
          Monitor your own products →
        </a>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            color: 'var(--text-muted)',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
