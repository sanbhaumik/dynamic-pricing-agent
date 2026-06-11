import { useState } from 'react'

const FLAGS = { us: '🇺🇸', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', ca: '🇨🇦', au: '🇦🇺' }
const ALL_MARKETS = ['us', 'gb', 'de', 'fr', 'ca', 'au']
const INTERVALS = ['30 min', '1 hour', '2 hours', '6 hours', '12 hours', '24 hours']

function Field({ label, children, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--accent-danger)' }}>{error}</span>}
    </div>
  )
}

export default function ProductConfig({ product, onChange, mode, loading }) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const update = (field, value) => onChange({ ...product, [field]: value })

  const toggleMarket = (market) => {
    const active = product.markets || []
    if (active.includes(market)) {
      if (active.length <= 1) return
      onChange({ ...product, markets: active.filter((m) => m !== market) })
    } else {
      onChange({ ...product, markets: [...active, market] })
    }
  }

  const priceError =
    product.margin_floor != null &&
    product.current_price != null &&
    Number(product.margin_floor) >= Number(product.current_price)

  const inputStyle = {
    height: 34,
    padding: '0 10px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    width: '100%',
    transition: 'border-color 0.15s',
  }

  const monoInput = { ...inputStyle, fontFamily: 'var(--font-mono)' }

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      left: 0,
      bottom: 32,
      width: 272,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      overflowY: 'auto',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 80,
    }}>

      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 20,
      }}>
        Product
      </div>

      <Field label="Search query">
        <input
          style={inputStyle}
          value={product.query || ''}
          onChange={(e) => update('query', e.target.value)}
          disabled={loading}
          placeholder="Sony WH-1000XM5"
        />
      </Field>

      <Field label="Your price">
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13, pointerEvents: 'none',
          }}>$</span>
          <input
            style={{ ...monoInput, paddingLeft: 22 }}
            type="number" step="0.01"
            value={product.current_price ?? ''}
            onChange={(e) => update('current_price', parseFloat(e.target.value))}
            disabled={loading}
          />
        </div>
      </Field>

      <Field
        label="Margin floor"
        error={priceError ? 'Must be below current price' : null}
      >
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13, pointerEvents: 'none',
          }}>$</span>
          <input
            style={{ ...monoInput, paddingLeft: 22, borderColor: priceError ? 'var(--accent-danger)' : undefined }}
            type="number" step="0.01"
            value={product.margin_floor ?? ''}
            onChange={(e) => update('margin_floor', parseFloat(e.target.value))}
            disabled={loading}
          />
        </div>
      </Field>

      <Field label="Markets">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ALL_MARKETS.map((m) => {
            const active = (product.markets || []).includes(m)
            return (
              <button
                key={m}
                onClick={() => toggleMarket(m)}
                disabled={loading}
                style={{
                  padding: '4px 9px',
                  borderRadius: 5,
                  border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'all 0.12s',
                }}
              >
                {FLAGS[m]} {m.toUpperCase()}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

      {/* Advanced settings toggle */}
      <button
        onClick={() => setAdvancedOpen((o) => !o)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '4px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontFamily: 'var(--font-sans)',
          marginBottom: advancedOpen ? 12 : 0,
        }}
      >
        <span style={{ fontWeight: 500 }}>Advanced</span>
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          transition: 'transform 0.2s',
          display: 'inline-block',
          transform: advancedOpen ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </button>

      {advancedOpen && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Field label="Amazon ASIN">
            <input
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}
              value={product.asin || ''}
              onChange={(e) => update('asin', e.target.value)}
              placeholder="B09XS7JWHH"
              disabled={loading}
            />
          </Field>

          <Field label="Target position">
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((pos) => {
                const active = product.target_position === pos
                return (
                  <button
                    key={pos}
                    onClick={() => update('target_position', pos)}
                    disabled={loading}
                    style={{
                      flex: 1, height: 32,
                      borderRadius: 5,
                      border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {pos}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Check interval">
            <select
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
              defaultValue="2 hours"
              disabled={loading}
            >
              {INTERVALS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
        </div>
      )}

      {/* Live mode CTA */}
      {mode === 'demo' && (
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 16,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>
              Using sample data. Add a Bright Data API key to monitor real products.
            </div>
            <a
              href="https://brightdata.com/products/serp-api"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-primary)', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}
            >
              Get a free API key →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
