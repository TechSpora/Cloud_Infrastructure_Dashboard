<template>
  <div class="scaling">
    <h2>Auto-Scaling Management</h2>

    <div class="scaling-actions">
      <div class="action-card">
        <h3>Manual Scaling</h3>
        <div class="form-group">
          <label>Service ID</label>
          <input v-model="manualScaling.serviceId" type="text" placeholder="cluster/service">
        </div>
        <div class="form-group">
          <label>Action</label>
          <select v-model="manualScaling.action">
            <option value="scale-up">Scale Up</option>
            <option value="scale-down">Scale Down</option>
            <option value="set">Set Count</option>
          </select>
        </div>
        <div class="form-group" v-if="manualScaling.action === 'set'">
          <label>Count</label>
          <input v-model.number="manualScaling.count" type="number" min="0">
        </div>
        <button @click="performManualScaling" :disabled="scalingInProgress" class="btn-primary">
          {{ scalingInProgress ? 'Scaling...' : 'Execute Scaling' }}
        </button>
      </div>
    </div>

    <div class="policies-section">
      <div class="section-header">
        <h3>Scaling Policies</h3>
        <button @click="showCreatePolicy = true" class="btn-primary">Create Policy</button>
      </div>

      <div v-if="showCreatePolicy" class="create-policy-card">
        <h4>Create New Scaling Policy</h4>
        <div class="form-group">
          <label>Policy Name</label>
          <input v-model="newPolicy.name" type="text">
        </div>
        <div class="form-group">
          <label>Target Service</label>
          <input v-model="newPolicy.targetService" type="text" placeholder="web-service">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Min Instances</label>
            <input v-model.number="newPolicy.minInstances" type="number" min="0">
          </div>
          <div class="form-group">
            <label>Max Instances</label>
            <input v-model.number="newPolicy.maxInstances" type="number" min="1">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Scale Up Threshold (%)</label>
            <input v-model.number="newPolicy.scaleUpThreshold" type="number" min="0" max="100">
          </div>
          <div class="form-group">
            <label>Scale Down Threshold (%)</label>
            <input v-model.number="newPolicy.scaleDownThreshold" type="number" min="0" max="100">
          </div>
        </div>
        <div class="form-group">
          <label>
            <input v-model="newPolicy.enabled" type="checkbox"> Enabled
          </label>
        </div>
        <div class="form-actions">
          <button @click="createPolicy" class="btn-primary">Create Policy</button>
          <button @click="cancelCreatePolicy" class="btn-secondary">Cancel</button>
        </div>
      </div>

      <div class="policies-grid">
        <div v-for="policy in policies" :key="policy.id" class="policy-card">
          <div class="policy-header">
            <h4>{{ policy.name }}</h4>
            <span :class="['status-badge', policy.enabled ? 'enabled' : 'disabled']">
              {{ policy.enabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
          <div class="policy-details">
            <div class="detail-item">
              <span class="detail-label">Target Service:</span>
              <span class="detail-value">{{ policy.targetService }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Instance Range:</span>
              <span class="detail-value">{{ policy.minInstances }} - {{ policy.maxInstances }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Scale Up:</span>
              <span class="detail-value">{{ policy.scaleUpThreshold }}% CPU</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Scale Down:</span>
              <span class="detail-value">{{ policy.scaleDownThreshold }}% CPU</span>
            </div>
          </div>
          <div class="policy-actions">
            <button 
              @click="togglePolicy(policy)"
              :class="['btn-small', policy.enabled ? 'btn-danger' : 'btn-success']"
            >
              {{ policy.enabled ? 'Disable' : 'Enable' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="policies.length === 0" class="empty-state">
        No scaling policies configured. Create one to get started.
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api'

export default {
  name: 'Scaling',
  data() {
    return {
      policies: [],
      manualScaling: {
        serviceId: '',
        action: 'scale-up',
        count: 1
      },
      newPolicy: {
        name: '',
        targetService: '',
        minInstances: 2,
        maxInstances: 10,
        targetCPUUtilization: 70,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        scaleUpIncrement: 2,
        scaleDownIncrement: 1,
        cooldownPeriod: 300,
        enabled: true
      },
      showCreatePolicy: false,
      scalingInProgress: false
    }
  },
  mounted() {
    this.loadPolicies()
  },
  methods: {
    async loadPolicies() {
      try {
        const response = await api.getScalingPolicies()
        this.policies = response.data
      } catch (error) {
        console.error('Error loading policies:', error)
      }
    },
    async performManualScaling() {
      if (!this.manualScaling.serviceId) {
        alert('Please enter a service ID')
        return
      }

      this.scalingInProgress = true
      try {
        const response = await api.manualScale(
          this.manualScaling.serviceId,
          this.manualScaling.action,
          this.manualScaling.count
        )
        alert(response.data.message || 'Scaling operation completed')
        this.manualScaling.serviceId = ''
      } catch (error) {
        alert('Error performing scaling: ' + (error.response?.data?.error || error.message))
      } finally {
        this.scalingInProgress = false
      }
    },
    async createPolicy() {
      try {
        const response = await api.createScalingPolicy(this.newPolicy)
        this.policies.push(response.data)
        this.cancelCreatePolicy()
      } catch (error) {
        alert('Error creating policy: ' + (error.response?.data?.error || error.message))
      }
    },
    cancelCreatePolicy() {
      this.showCreatePolicy = false
      this.newPolicy = {
        name: '',
        targetService: '',
        minInstances: 2,
        maxInstances: 10,
        targetCPUUtilization: 70,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        scaleUpIncrement: 2,
        scaleDownIncrement: 1,
        cooldownPeriod: 300,
        enabled: true
      }
    },
    async togglePolicy(policy) {
      try {
        const response = await api.createScalingPolicy({
          ...policy,
          enabled: !policy.enabled
        })
        const index = this.policies.findIndex(p => p.id === policy.id)
        if (index !== -1) {
          this.policies[index] = response.data
        }
      } catch (error) {
        alert('Error updating policy: ' + (error.response?.data?.error || error.message))
      }
    }
  }
}
</script>

<style scoped>
.scaling h2 {
  margin-bottom: 2rem;
  color: #333;
}

.scaling-actions {
  margin-bottom: 2rem;
}

.action-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.action-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-secondary:hover {
  background: #5a6268;
}

.policies-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  color: #333;
}

.create-policy-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.create-policy-card h4 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.policies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.policy-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.policy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.policy-header h4 {
  margin: 0;
  color: #333;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.enabled {
  background: #d4edda;
  color: #155724;
}

.status-badge.disabled {
  background: #f8d7da;
  color: #721c24;
}

.policy-details {
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #666;
}

.detail-value {
  font-weight: 600;
  color: #333;
}

.policy-actions {
  margin-top: 1rem;
}

.btn-small {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 3rem;
}
</style>

