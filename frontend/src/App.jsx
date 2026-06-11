import React, { useState, useEffect } from 'react'
import {
  getStatus,
  getProducts,
  runAnalysis,
  getDecisions,
  applyDecision,
  dismissDecision,
  getHistory,
} from './api'

import DemoBanner from './components/DemoBanner'
import Header from './components/Header'
import StatusBar from './components/StatusBar'
import ProductConfig from './components/ProductConfig'
import MarketPanel from './components/MarketPanel'
import BuyBoxPanel from './components/BuyBoxPanel'
import DecisionPanel from './components/DecisionPanel'
import HistoryDrawer from './components/HistoryDrawer'
import PriceChart from './components/PriceChart'

const DEFAULT_PRODUCT = {
  query: 'Sony WH-1000XM5',
  current_price: 279.00,
  margin_floor: 195.00,
  markets: ['us', 'gb', 'de', 'fr'],
  asin: 'B09XS7JWHH',
  target_position: 2,
}

export default function App() {
  const [mode, setMode] = useState('demo')
  const [analysisData, setAnalysisData] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendOffline, setBackendOffline] = useState(false)
  const [product, setProduct] = useState(DEFAULT_PRODUCT)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [demoDismissed, setDemoDismissed] = useState(false)

  // On mount: load status, products, and pre-load demo history
  useEffect(() => {
    getStatus()
      .then((s) => {
        setMode(s.mode)
        setBackendOffline(false)
      })
      .catch(() => setBackendOffline(true))

    getProducts()
      .then((p) => {
        setProduct((prev) => ({
          ...prev,
          query: p.query != null ? p.query : prev.query,
          current_price: p.current_price != null ? p.current_price : prev.current_price,
          margin_floor: p.margin_floor != null ? p.margin_floor : prev.margin_floor,
          markets: p.markets != null ? p.markets : prev.markets,
          asin: p.asin != null ? p.asin : prev.asin,
          target_position: p.target_position != null ? p.target_position : prev.target_position,
        }))
      })
      .catch(() => {})

    getDecisions('sony-wh1000xm5', true)
      .then(setDecisions)
      .catch(() => {})
  }, [])

  const refreshDecisions = (sku = product.query || 'sony-wh1000xm5') => {
    const isDemo = mode === 'demo'
    getDecisions(sku, isDemo)
      .then(setDecisions)
      .catch(() => {})
  }

  const refreshHistory = () => {
    getHistory('sony-wh1000xm5', 'us')
      .then(setHistory)
      .catch(() => {})
  }

  const handleRunAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await runAnalysis({
        ...product,
        demo_mode: mode === 'demo',
      })

      // Enrich decision with timestamp and id for DecisionPanel
      if (result.decision) {
        result.decision.timestamp = result.analysed_at
        result.decision.id = result.decision.id || `dec_session_${Date.now()}`
      }

      setAnalysisData(result)

      // Append chart point
      if (result.decision?.market_snapshot?.lowest_competitor_price != null) {
        setHistory((prev) => [
          ...prev,
          {
            timestamp: result.analysed_at,
            lowest_competitor_price: result.decision.market_snapshot.lowest_competitor_price,
          },
        ])
      }

      refreshDecisions()
    } catch (err) {
      setError(err.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (decisionId, recommendedPrice) => {
    try {
      await applyDecision(decisionId)
      if (recommendedPrice != null) {
        setProduct((prev) => ({ ...prev, current_price: recommendedPrice }))
      }
      refreshDecisions()
    } catch (err) {
      console.error('Apply failed', err)
    }
  }

  const handleDismiss = async (decisionId) => {
    try {
      await dismissDecision(decisionId)
      refreshDecisions()
    } catch (err) {
      console.error('Dismiss failed', err)
    }
  }

  const showDemo = mode === 'demo' && !demoDismissed

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Backend offline warning */}
      {backendOffline && (
        <div style={{
          background: '#7c2d12',
          color: '#fef3c7',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: 13,
        }}>
          ⚠ Cannot connect to backend — make sure uvicorn is running on port 8000
        </div>
      )}

      {/* Demo banner — always first when in demo mode */}
      {showDemo && (
        <DemoBanner onDismiss={() => setDemoDismissed(true)} />
      )}

      <Header
        mode={mode}
        productName={product.query}
        markets={product.markets}
        loading={loading}
        onRunAnalysis={handleRunAnalysis}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* Main layout: sidebar + grid */}
      <div style={{ display: 'flex', flex: 1, paddingTop: 56, paddingBottom: 32 }}>
        {/* Left sidebar */}
        <ProductConfig
          product={product}
          onChange={(updated) => setProduct(updated)}
          mode={mode}
          loading={loading}
        />

        {/* Main content area */}
        <div style={{ flex: 1, marginLeft: 272, padding: '20px 24px', paddingBottom: 48 }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--accent-danger)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              color: 'var(--accent-danger)',
              fontSize: 13,
            }}>
              Analysis failed — {error}
            </div>
          )}

          {!analysisData && !loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              gap: 12,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Configure a product and click Run Analysis
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {mode === 'demo' ? 'Demo mode — no API keys required' : 'Live mode active'}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <DecisionPanel
                  decision={analysisData?.decision || null}
                  currentPrice={product.current_price}
                  loading={loading}
                  onApply={handleApply}
                  onDismiss={handleDismiss}
                />
              </div>
              <MarketPanel
                data={analysisData?.market_data || null}
                currentPrice={product.current_price}
                loading={loading}
              />
              <BuyBoxPanel
                data={analysisData?.amazon || null}
                asin={product.asin}
                currentPrice={product.current_price}
                loading={loading}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <PriceChart
                  data={history}
                  currentPrice={product.current_price}
                  loading={loading}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusBar
        mode={mode}
        lastAnalysis={analysisData?.analysed_at || null}
        markets={product.markets}
        loading={loading}
      />

      <HistoryDrawer
        open={historyOpen}
        decisions={decisions}
        onClose={() => setHistoryOpen(false)}
        onApply={handleApply}
        onDismiss={handleDismiss}
      />
    </div>
  )
}
