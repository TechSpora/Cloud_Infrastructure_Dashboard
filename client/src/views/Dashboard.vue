<template>
  <div class="dashboard">
    <h2>Dashboard Overview</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ metrics.cpu }}%</div>
          <div class="stat-label">CPU Usage</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💾</div>
        <div class="stat-content">
          <div class="stat-value">{{ metrics.memory }}%</div>
          <div class="stat-label">Memory Usage</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${{ formatNumber(costs.monthly) }}</div>
          <div class="stat-label">Monthly Cost</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">{{ activeAlerts.length }}</div>
          <div class="stat-label">Active Alerts</div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-card">
        <h3>Resource Overview</h3>
        <div class="resource-list">
          <div class="resource-item">
            <span class="resource-label">EC2 Instances:</span>
            <span class="resource-value">{{ resources.ec2Instances?.length || 0 }}</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">ECS Clusters:</span>
            <span class="resource-value">{{ resources.ecsClusters?.length || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-card">
        <h3>Recent Alerts</h3>
        <div class="alert-list">
          <div 
            v-for="alert in recentAlerts" 
            :key="alert.id" 
            :class="['alert-item', `alert-${alert.severity}`]"
          >
            <div class="alert-header">
              <span class="alert-title">{{ alert.ruleName || alert.title }}</span>
              <span class="alert-time">{{ formatTime(alert.createdAt) }}</span>
            </div>
            <div class="alert-message">{{ alert.message }}</div>
          </div>
          <div v-if="recentAlerts.length === 0" class="no-alerts">
            No recent alerts
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api'
import socket from '../services/socket'

export default {
  name: 'Dashboard',
  data() {
    return {
      metrics: {
        cpu: 0,
        memory: 0
      },
      resources: {
        ec2Instances: [],
        ecsClusters: []
      },
      costs: {
        monthly: 0
      },
      alerts: [],
      loading: true
    }
  },
  computed: {
    activeAlerts() {
      return this.alerts.filter(a => a.status === 'active')
    },
    recentAlerts() {
      return this.alerts
        .filter(a => a.status === 'active')
        .slice(0, 5)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  },
  mounted() {
    this.loadData()
    this.setupSocket()
  },
  beforeUnmount() {
    socket.disconnect()
  },
  methods: {
    async loadData() {
      try {
        const [metricsRes, resourcesRes, costsRes, alertsRes] = await Promise.all([
          api.getMetrics(),
          api.getResources(),
          api.getCosts(),
          api.getAlerts()
        ])

        this.metrics = metricsRes.data
        this.resources = resourcesRes.data
        this.costs = costsRes.data
        this.alerts = alertsRes.data
        this.loading = false
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        this.loading = false
      }
    },
    setupSocket() {
      socket.connect()
      
      socket.on('metrics', (data) => {
        this.metrics = data
      })
      
      socket.on('resources', (data) => {
        this.resources = data
      })
      
      socket.on('costs', (data) => {
        this.costs = data
      })
      
      socket.on('alerts', (data) => {
        this.alerts = data
      })
    },
    formatNumber(num) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatTime(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleString()
    }
  }
}
</script>

<style scoped>
.dashboard h2 {
  margin-bottom: 2rem;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.dashboard-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.dashboard-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.resource-label {
  color: #666;
}

.resource-value {
  font-weight: bold;
  color: #667eea;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.alert-item {
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid;
}

.alert-warning {
  background: #fff3cd;
  border-color: #ffc107;
}

.alert-critical {
  background: #f8d7da;
  border-color: #dc3545;
}

.alert-info {
  background: #d1ecf1;
  border-color: #0dcaf0;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.alert-title {
  font-weight: 600;
}

.alert-time {
  font-size: 0.85rem;
  color: #666;
}

.alert-message {
  color: #555;
  font-size: 0.9rem;
}

.no-alerts {
  text-align: center;
  color: #999;
  padding: 2rem;
}
</style>

