const FLAGS = { us: '🇺🇸', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', ca: '🇨🇦', au: '🇦🇺' }

function fmt(price, currency) {
  const sym = { USD: '$', GBP: '£', EUR: '€' }[currency] || '$'
  return `${sym}${Number(price).toFixed(2)}`
}

// Returns an rgba color string encoding competitive threat level
function heatColor(row, currentPrice) {
  if (row.is_you) return 'rgba(99,102,241,0.55)'
  if (!row.price) return 'rgba(71,85,105,0.25)'
  const pct = (currentPrice - row.price) / currentPrice // positive = they're below you
  if (pct > 0.1)  return 'rgba(239,68,68,0.85)'   // significantly cheaper — high threat
  if (pct > 0)    return 'rgba(239,68,68,0.38)'   // slightly cheaper — low threat
  if (pct > -0.1) return 'rgba(0,212,133,0.45)'  // slightly above — safe
  return 'rgba(71,85,105,0.25)'                   // well above — neutral
}

function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: 0, width: 4 }} />
      {[36, 100, 64, 52, 32].map((w, i) => (
        <td key={i} style={{ padding: '9px 12px' }}>
          <div className="skeleton" style={{ height: 12, width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function MarketPanel({ data, currentPrice, loading }) {
  let rows = []
  if (data) {
    Object.values(data).forEach((country) => country.forEach((r) => rows.push(r)))
    rows.sort((a, b) => {
      if (a.is_you && !b.is_you) return -1
      if (!a.is_you && b.is_you) return 1
      return (a.price || 0) - (b.price || 0)
    })
  }

  const grouped = {}
  rows.forEach((r) => {
    const c = r.country || 'us'
    if (!grouped[c]) grouped[c] = []
    grouped[c].push(r)
  })

  return (
    <div className="panel" style={{ animation: 'fadeUp 0.3s ease' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16,
      }}>
        Market Intelligence
      </div>

      {loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
        </table>
      )}

      {!loading && !data && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '28px 0', textAlign: 'center' }}>
          Run an analysis to see competitor prices
        </div>
      )}

      {!loading && data && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Heat bar column — no header */}
                <th style={{ padding: 0, width: 4 }} />
                {['Market', 'Seller', 'Price', 'vs. yours', 'Rank'].map((h, i) => (
                  <th key={h} style={{
                    padding: '0 12px 10px',
                    textAlign: i >= 2 ? 'right' : 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([country, countryRows]) =>
                countryRows.map((row, ri) => {
                  const diff    = row.is_you ? null : (row.price - currentPrice)
                  const cheaper = !row.is_you && row.price < currentPrice
                  const bar     = heatColor(row, currentPrice)

                  const handleRowClick = () => {
                    if (!row.is_you && row.link) {
                      window.open(row.link, '_blank', 'noopener,noreferrer')
                    }
                  }

                  return (
                    <tr
                      key={`${country}-${ri}`}
                      onClick={handleRowClick}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: row.is_you ? 'rgba(99,102,241,0.05)' : 'transparent',
                        cursor: (!row.is_you && row.link) ? 'pointer' : 'default',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        if (!row.is_you && row.link) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = row.is_you
                          ? 'rgba(99,102,241,0.05)'
                          : 'transparent'
                      }}
                    >
                      {/* Heat bar */}
                      <td style={{ padding: 0, width: 4, background: bar }} />

                      {/* Market */}
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                        {ri === 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>{FLAGS[country] || country.toUpperCase()}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                              {country.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Seller */}
                      <td style={{ padding: '9px 12px', maxWidth: 180 }}>
                        <span style={{
                          color: row.is_you ? 'var(--accent-primary)' : 'var(--text-primary)',
                          fontWeight: row.is_you ? 600 : 400,
                          borderBottom: (!row.is_you && row.link) ? '1px dashed var(--border)' : 'none',
                        }}>
                          {row.seller}
                        </span>
                        {row.is_you && (
                          <span style={{
                            marginLeft: 7, fontSize: 10, fontWeight: 600,
                            letterSpacing: '0.06em', color: 'var(--accent-primary)',
                            opacity: 0.7,
                          }}>YOU</span>
                        )}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        <span style={{
                          color: row.is_you ? 'var(--text-primary)'
                            : cheaper ? 'var(--accent-danger)' : 'var(--text-primary)',
                        }}>
                          {fmt(row.price, row.currency)}
                        </span>
                      </td>

                      {/* Delta */}
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {row.is_you ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : diff > 0 ? (
                          <span style={{ color: 'var(--accent-success)' }}>+{fmt(diff, row.currency)}</span>
                        ) : (
                          <span style={{ color: 'var(--accent-danger)' }}>{fmt(diff, row.currency)}</span>
                        )}
                      </td>

                      {/* Rank */}
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {row.position}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
