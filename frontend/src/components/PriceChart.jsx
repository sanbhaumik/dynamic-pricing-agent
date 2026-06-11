import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontFamily: 'var(--font-mono)', color: p.color, marginBottom: 2 }}>
          {p.name}: ${Number(p.value).toFixed(2)}
        </div>
      ))}
    </div>
  )
}

export default function PriceChart({ data, currentPrice, loading }) {
  // Build chart data — omit competitor value if null/zero so Recharts doesn't draw a line to 0
  const chartData = (data || []).map((d) => {
    const comp = d.lowest_competitor_price
    return {
      time: d.timestamp ? new Date(d.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
      'Lowest Competitor': (comp && comp > 0) ? comp : undefined,
      'Your Price': currentPrice,
    }
  })

  // Y-axis domain: floor at 80% of the lowest visible price, ceiling auto
  const allPrices = chartData.flatMap((d) =>
    [d['Your Price'], d['Lowest Competitor']].filter(Boolean)
  )
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) * 0.85) : 0

  return (
    <div className="panel" style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16,
      }}>
        Price History
      </div>

      {loading && !data?.length && (
        <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
      )}

      {!loading && (!data || data.length < 2) && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          Price history builds after 2+ analyses
        </div>
      )}

      {data?.length >= 2 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,42,58,0.5)" />
            <XAxis
              dataKey="time"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' }}
              tickFormatter={(v) => `$${v}`}
              axisLine={false}
              tickLine={false}
              width={55}
              domain={[yMin, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontFamily: 'var(--font-sans)', fontSize: 12, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="Your Price"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-primary)' }}
            />
            <Line
              type="monotone"
              dataKey="Lowest Competitor"
              stroke="var(--accent-danger)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, fill: 'var(--accent-danger)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
