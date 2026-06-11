import { useState, useEffect } from 'react'

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ACTION_COLOR = {
  reprice:  'var(--accent-primary)',
  hold:     'var(--accent-warning)',
  escalate: 'var(--accent-danger)',
}

export default function DecisionPanel({ decision, currentPrice, loading, onApply, onDismiss }) {
  const [applied, setApplied] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setApplied(false)
    setDismissed(false)
    // crossfade in on new decision
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [decision])

  if (loading && !decision) {
    return (
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="section-label" style={{ margin: 0 }}>Recommendation</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ height: 72, width: '45%', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 32, width: '30%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: '20%', borderRadius: 3 }} />
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <div className="skeleton" style={{ height: 4, width: '100%', borderRadius: 2 }} />
          <div className="skeleton" style={{ height: 13, width: '80%', borderRadius: 3 }} />
          <div className="skeleton" style={{ height: 13, width: '60%', borderRadius: 3 }} />
        </div>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="panel">
        <div className="section-label">Recommendation</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
          Run an analysis to get a pricing recommendation
        </div>
      </div>
    )
  }

  if (dismissed) {
    return (
      <div className="panel">
        <div className="section-label">Recommendation</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
          Recommendation dismissed
        </div>
      </div>
    )
  }

  const recPrice    = decision.recommended_price ?? currentPrice
  const diff        = recPrice - currentPrice
  const verdictColor = ACTION_COLOR[decision.action] || 'var(--accent-primary)'

  const handleApply = async () => {
    setApplied(true)
    await onApply?.(decision.id || 'local', recPrice)
  }

  return (
    <div
      className="panel"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="section-label" style={{ margin: 0 }}>Recommendation</div>
        {decision.timestamp && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {timeAgo(decision.timestamp)}
          </span>
        )}
      </div>

      {/* Flash sale notice */}
      {decision.flash_sale_detected && (
        <div style={{
          padding: '9px 12px', borderRadius: 5,
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.22)',
          fontSize: 12, color: 'var(--accent-warning)',
          marginBottom: 20, lineHeight: 1.5,
        }}>
          Abnormal price drop detected — holding until market stabilises
        </div>
      )}

      {/* VERDICT — 80px DM Mono hero */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 80,
        fontWeight: 500,
        lineHeight: 0.9,
        letterSpacing: '-0.04em',
        color: verdictColor,
        marginBottom: 14,
      }}>
        {decision.action.toUpperCase()}
      </div>

      {/* Recommended price */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 36,
        fontWeight: 400,
        color: 'var(--text-secondary)',
        letterSpacing: '-0.02em',
        marginBottom: 8,
      }}>
        ${Number(recPrice).toFixed(2)}
      </div>

      {/* Price delta */}
      {diff !== 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 20,
        }}>
          <span style={{ color: 'var(--text-muted)' }}>${Number(currentPrice).toFixed(2)}</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span style={{
            background: diff < 0 ? 'rgba(0,212,133,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${diff < 0 ? 'rgba(0,212,133,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: diff < 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
            padding: '1px 7px', borderRadius: 3, fontSize: 11, letterSpacing: '0.04em',
          }}>
            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
          </span>
        </div>
      )}
      {diff === 0 && <div style={{ marginBottom: 20 }} />}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

      {/* Confidence row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap',
        }}>
          Confidence
        </div>
        <div className="conf-track" style={{ flex: 1 }}>
          <div
            className="conf-fill"
            style={{ width: `${decision.confidence || 0}%`, background: verdictColor }}
          />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {decision.confidence}%
        </div>
      </div>

      {/* Reasoning */}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {decision.reasoning}
      </p>

      {/* Buttons */}
      {applied ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--accent-success)', fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}>
          <span>✓</span>
          <span>Applied — ${Number(recPrice).toFixed(2)}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-success"
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
            onClick={handleApply}
          >
            Apply ${Number(recPrice).toFixed(2)}
          </button>
          <button
            className="btn btn-danger-outline"
            onClick={() => { setDismissed(true); onDismiss?.(decision.id || 'local') }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
