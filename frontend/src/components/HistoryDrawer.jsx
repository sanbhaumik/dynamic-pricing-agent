import { useState } from 'react'

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function HistoryEntry({ entry, onApply, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  const diff = entry.recommended_price - entry.current_price

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        padding: '12px 0',
        borderBottom: '1px solid rgba(42,42,58,0.5)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge badge-${entry.action}`}>{entry.action}</span>
          <span className={`badge badge-${entry.status}`}>{entry.status}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(entry.timestamp)}</span>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        marginBottom: 5,
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>${Number(entry.current_price).toFixed(2)}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <span style={{ color: diff < 0 ? 'var(--accent-success)' : diff > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
          ${Number(entry.recommended_price).toFixed(2)}
        </span>
        {diff !== 0 && (
          <span style={{ fontSize: 11, color: diff < 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            ({diff > 0 ? '+' : ''}{diff.toFixed(2)})
          </span>
        )}
      </div>

      <div style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        overflow: 'hidden',
        whiteSpace: expanded ? 'normal' : 'nowrap',
        textOverflow: expanded ? 'unset' : 'ellipsis',
        lineHeight: 1.5,
      }}>
        {entry.reasoning}
      </div>

      {expanded && entry.status === 'pending' && (
        <div
          style={{ display: 'flex', gap: 8, marginTop: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="btn btn-success"
            style={{ flex: 1, fontSize: 12, height: 30 }}
            onClick={() => onApply(entry.id, entry.recommended_price)}
          >
            Apply
          </button>
          <button
            className="btn btn-danger-outline"
            style={{ flex: 1, fontSize: 12, height: 30 }}
            onClick={() => onDismiss(entry.id)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

export default function HistoryDrawer({ open, decisions, onClose, onApply, onDismiss }) {
  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 199,
        }}
      />
      <div style={{
        position: 'fixed',
        top: 0, right: 0,
        width: 360,
        height: '100vh',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            Decision History
          </span>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
              padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
          {decisions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 48 }}>
              No decision history yet
            </div>
          ) : (
            decisions.map((d) => (
              <HistoryEntry
                key={d.id}
                entry={d}
                onApply={onApply}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
