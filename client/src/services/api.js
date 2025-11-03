import axios from 'axios'

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default {
  // Health check
  getHealth() {
    return api.get('/health')
  },

  // Metrics
  getMetrics() {
    return api.get('/metrics')
  },

  // Resources
  getResources() {
    return api.get('/resources')
  },

  // Scaling
  manualScale(serviceId, action, count) {
    return api.post('/scaling/manual', { serviceId, action, count })
  },

  getScalingPolicies() {
    return api.get('/scaling/policies')
  },

  createScalingPolicy(policy) {
    return api.post('/scaling/policies', policy)
  },

  // Costs
  getCosts() {
    return api.get('/costs')
  },

  getCostRecommendations() {
    return api.get('/costs/recommendations')
  },

  // Alerts
  getAlerts() {
    return api.get('/alerts')
  },

  createAlert(alert) {
    return api.post('/alerts', alert)
  },

  updateAlert(id, updates) {
    return api.put(`/alerts/${id}`, updates)
  }
}

