<template>
  <div class="monitoring">
    <h2>Real-time Monitoring</h2>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>CPU Utilization</h3>
        <div class="metric-value">{{ metrics.cpu }}%</div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: metrics.cpu + '%', backgroundColor: getColor(metrics.cpu) }"
          ></div>
        </div>
      </div>

      <div class="metric-card">
        <h3>Memory Utilization</h3>
        <div class="metric-value">{{ metrics.memory }}%</div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: metrics.memory + '%', backgroundColor: getColor(metrics.memory) }"
          ></div>
        </div>
      </div>

      <div class="metric-card">
        <h3>Network In</h3>
        <div class="metric-value">{{ formatBytes(metrics.networkIn) }}</div>
      </div>

      <div class="metric-card">
        <h3>Network Out</h3>
        <div class="metric-value">{{ formatBytes(metrics.networkOut) }}</div>
      </div>
    </div>

    <div class="chart-section">
      <div class="chart-card">
        <h3>CPU Usage Over Time</h3>
        <LineChart :data="cpuChartData" />
      </div>
      <div class="chart-card">
        <h3>Memory Usage Over Time</h3>
        <LineChart :data="memoryChartData" />
      </div>
    </div>

    <div class="resources-section">
      <h3>Cloud Resources</h3>
      
      <div class="resource-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'ec2' }]"
          @click="activeTab = 'ec2'"
        >
          EC2 Instances
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'ecs' }]"
          @click="activeTab = 'ecs'"
        >
          ECS Clusters
        </button>
      </div>

      <div v-if="activeTab === 'ec2'" class="resource-table">
        <table>
          <thead>
            <tr>
              <th>Instance ID</th>
              <th>Type</th>
              <th>State</th>
              <th>Launch Time</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="instance in resources.ec2Instances" :key="instance.id">
              <td>{{ instance.id }}</td>
              <td>{{ instance.type }}</td>
              <td>
                <span :class="['status-badge', `status-${instance.state}`]">
                  {{ instance.state }}
                </span>
              </td>
              <td>{{ formatDate(instance.launchTime) }}</td>
              <td>
                <span 
                  v-for="tag in instance.tags" 
                  :key="tag.Key"
                  class="tag-badge"
                >
                  {{ tag.Key }}: {{ tag.Value }}
                </span>
              </td>
            </tr>
            <tr v-if="!resources.ec2Instances || resources.ec2Instances.length === 0">
              <td colspan="5" class="empty-state">No EC2 instances found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'ecs'" class="resource-table">
        <table>
          <thead>
            <tr>
              <th>Cluster Name</th>
              <th>Status</th>
              <th>Running Tasks</th>
              <th>Pending Tasks</th>
              <th>Active Services</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cluster in resources.ecsClusters" :key="cluster.name">
              <td>{{ cluster.name }}</td>
              <td>
                <span :class="['status-badge', `status-${cluster.status.toLowerCase()}`]">
                  {{ cluster.status }}
                </span>
              </td>
              <td>{{ cluster.runningTasks }}</td>
              <td>{{ cluster.pendingTasks }}</td>
              <td>{{ cluster.activeServices }}</td>
            </tr>
            <tr v-if="!resources.ecsClusters || resources.ecsClusters.length === 0">
              <td colspan="5" class="empty-state">No ECS clusters found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api'
import socket from '../services/socket'
import LineChart from '../components/LineChart.vue'

export default {
  name: 'Monitoring',
  components: {
    LineChart
  },
  data() {
    return {
      metrics: {
        cpu: 0,
        memory: 0,
        networkIn: 0,
        networkOut: 0
      },
      resources: {
        ec2Instances: [],
        ecsClusters: []
      },
      activeTab: 'ec2',
      cpuHistory: [],
      memoryHistory: []
    }
  },
  computed: {
    cpuChartData() {
      return {
        labels: this.cpuHistory.map((_, i) => i),
        datasets: [{
          label: 'CPU %',
          data: this.cpuHistory.map(m => m.cpu),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)'
        }]
      }
    },
    memoryChartData() {
      return {
        labels: this.memoryHistory.map((_, i) => i),
        datasets: [{
          label: 'Memory %',
          data: this.memoryHistory.map(m => m.memory),
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)'
        }]
      }
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
        const [metricsRes, resourcesRes] = await Promise.all([
          api.getMetrics(),
          api.getResources()
        ])

        this.metrics = metricsRes.data
        this.resources = resourcesRes.data
        
        // Initialize history
        this.cpuHistory.push({ cpu: metricsRes.data.cpu, timestamp: Date.now() })
        this.memoryHistory.push({ memory: metricsRes.data.memory, timestamp: Date.now() })
      } catch (error) {
        console.error('Error loading monitoring data:', error)
      }
    },
    setupSocket() {
      socket.connect()
      
      socket.on('metrics', (data) => {
        this.metrics = data
        
        // Update history (keep last 20 points)
        this.cpuHistory.push({ cpu: data.cpu, timestamp: Date.now() })
        this.memoryHistory.push({ memory: data.memory, timestamp: Date.now() })
        
        if (this.cpuHistory.length > 20) {
          this.cpuHistory.shift()
        }
        if (this.memoryHistory.length > 20) {
          this.memoryHistory.shift()
        }
      })
      
      socket.on('resources', (data) => {
        this.resources = data
      })
    },
    getColor(value) {
      if (value < 50) return '#28a745'
      if (value < 80) return '#ffc107'
      return '#dc3545'
    },
    formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
    },
    formatDate(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleString()
    }
  }
}
</script>

<style scoped>
.monitoring h2 {
  margin-bottom: 2rem;
  color: #333;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.metric-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.chart-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.resources-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.resources-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.resource-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e9ecef;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.3s;
}

.tab-button:hover {
  color: #667eea;
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.resource-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-running,
.status-active {
  background: #d4edda;
  color: #155724;
}

.status-stopped,
.status-inactive {
  background: #f8d7da;
  color: #721c24;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.tag-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 2rem;
}
</style>

