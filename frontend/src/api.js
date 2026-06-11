import axios from 'axios'

const BASE = 'http://localhost:8000'

const handle = (promise) =>
  promise.catch((err) => {
    const message = err.response?.data?.detail || err.message || 'Request failed'
    throw Object.assign(err, { message })
  })

export const getStatus = () =>
  handle(axios.get(`${BASE}/status`)).then((r) => r.data)

export const getProducts = () =>
  handle(axios.get(`${BASE}/products`)).then((r) => r.data)

export const runAnalysis = (body) =>
  handle(axios.post(`${BASE}/analyse`, body)).then((r) => r.data)

export const getDecisions = (sku = 'sony-wh1000xm5', demo = false) =>
  handle(axios.get(`${BASE}/decisions`, { params: { sku, demo } })).then((r) => r.data)

export const applyDecision = (id) =>
  handle(axios.post(`${BASE}/decisions/${id}/apply`)).then((r) => r.data)

export const dismissDecision = (id) =>
  handle(axios.post(`${BASE}/decisions/${id}/dismiss`)).then((r) => r.data)

export const getHistory = (sku = 'sony-wh1000xm5', market = 'us') =>
  handle(axios.get(`${BASE}/history`, { params: { sku, market } })).then((r) => r.data)
