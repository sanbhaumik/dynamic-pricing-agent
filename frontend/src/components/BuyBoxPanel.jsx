function StatRow({ label, value, mono = true }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid rgba(42,42,58,0.5)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--text-primary)',
        fontWeight: 500,
      }}>
        {value}
      </span>
    </div>
  )
}

export default function BuyBoxPanel({ data, asin, currentPrice, loading }) {
  const noAsin = !asin || asin.trim() === ''

  const sectionLabel = (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16,
    }}>
      Amazon Buy Box
    </div>
  )

  if (noAsin) {
    return (
      <div className="panel" style={{ animation: 'fadeUp 0.3s ease' }}>
        {sectionLabel}
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>
            Track Buy Box ownership
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Add your product ASIN in Advanced settings to see real-time Buy Box data.
          </div>
          <a
            href="https://brightdata.com/products/web-scraper"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}
          >
            Powered by Bright Data eCommerce Scraper →
          </a>
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="panel">
        {sectionLabel}
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 14, marginBottom: 14 }} />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="panel">
        {sectionLabel}
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Run an analysis to see Buy Box data</div>
      </div>
    )
  }

  const youOwnIt = data.buy_box_winner === 'You' || Number(data.buy_box_price) === Number(currentPrice)

  return (
    <div className="panel" style={{ animation: 'fadeUp 0.35s ease' }}>
      {sectionLabel}

      {/* Status strip */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 6,
        marginBottom: 16,
        background: youOwnIt ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
        border: `1px solid ${youOwnIt ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span className={`dot ${youOwnIt ? 'dot-live' : ''}`} style={{
          background: youOwnIt ? 'var(--accent-success)' : 'var(--accent-danger)',
        }} />
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: youOwnIt ? 'var(--accent-success)' : 'var(--accent-danger)',
          letterSpacing: '0.03em',
        }}>
          {youOwnIt ? 'You own the Buy Box' : `${data.buy_box_winner} owns the Buy Box`}
        </span>
      </div>

      {/* Stats */}
      <div>
        <StatRow label="Buy Box price" value={`$${Number(data.buy_box_price).toFixed(2)}`} />
        <StatRow label="Competing sellers" value={data.seller_count} />
        <StatRow
          label="Lowest listed"
          value={`$${Number(data.lowest_price).toFixed(2)}`}
        />
      </div>
    </div>
  )
}
