const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');

class ScalingService {
  constructor() {
    this.ecs = null;
    this.autoscaling = null;
    this.policiesFile = path.join(__dirname, '../data/scaling-policies.json');
    this.policies = [];
    this.initialized = false;
  }

  async initialize() {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.ecs = new AWS.ECS();
    this.autoscaling = new AWS.AutoScaling();
    
    // Load policies
    await this.loadPolicies();
    
    // Start auto-scaling check interval
    this.startAutoScalingCheck();
    
    this.initialized = true;
  }

  async loadPolicies() {
    try {
      await fs.mkdir(path.dirname(this.policiesFile), { recursive: true });
      const data = await fs.readFile(this.policiesFile, 'utf8');
      this.policies = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, use default policies
      this.policies = this.getDefaultPolicies();
      await this.savePolicies();
    }
  }

  async savePolicies() {
    try {
      await fs.writeFile(this.policiesFile, JSON.stringify(this.policies, null, 2));
    } catch (error) {
      console.error('Error saving policies:', error);
    }
  }

  getDefaultPolicies() {
    return [
      {
        id: 'policy-1',
        name: 'CPU-based scaling',
        enabled: true,
        targetService: 'web-service',
        minInstances: 2,
        maxInstances: 10,
        targetCPUUtilization: 70,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        scaleUpIncrement: 2,
        scaleDownIncrement: 1,
        cooldownPeriod: 300
      }
    ];
  }

  async manualScale(serviceId, action, count) {
    if (!this.ecs) {
      return {
        success: true,
        message: `Mock ${action} scaling for ${serviceId}`,
        newCount: count
      };
    }

    try {
      const [clusterName, serviceName] = serviceId.split('/');
      
      // Get current service
      const services = await this.ecs.describeServices({
        cluster: clusterName,
        services: [serviceName]
      }).promise();

      if (!services.services || services.services.length === 0) {
        throw new Error('Service not found');
      }

      const currentDesiredCount = services.services[0].desiredCount;
      let newDesiredCount = currentDesiredCount;

      if (action === 'scale-up') {
        newDesiredCount = currentDesiredCount + (count || 1);
      } else if (action === 'scale-down') {
        newDesiredCount = Math.max(0, currentDesiredCount - (count || 1));
      } else if (action === 'set') {
        newDesiredCount = count;
      }

      // Update service
      await this.ecs.updateService({
        cluster: clusterName,
        service: serviceName,
        desiredCount: newDesiredCount
      }).promise();

      return {
        success: true,
        message: `Service ${serviceName} scaled ${action} to ${newDesiredCount} instances`,
        previousCount: currentDesiredCount,
        newCount: newDesiredCount
      };
    } catch (error) {
      console.error('Error in manual scaling:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getPolicies() {
    return this.policies;
  }

  async createPolicy(policy) {
    const newPolicy = {
      id: `policy-${Date.now()}`,
      ...policy,
      enabled: policy.enabled !== false,
      createdAt: new Date().toISOString()
    };

    this.policies.push(newPolicy);
    await this.savePolicies();

    return newPolicy;
  }

  async updatePolicy(policyId, updates) {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index === -1) {
      throw new Error('Policy not found');
    }

    this.policies[index] = {
      ...this.policies[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.savePolicies();
    return this.policies[index];
  }

  async startAutoScalingCheck() {
    // Check scaling policies every minute
    setInterval(async () => {
      await this.checkAndScale();
    }, 60000);
  }

  async checkAndScale() {
    if (!this.initialized) return;

    const enabledPolicies = this.policies.filter(p => p.enabled);
    
    for (const policy of enabledPolicies) {
      try {
        await this.evaluatePolicy(policy);
      } catch (error) {
        console.error(`Error evaluating policy ${policy.id}:`, error);
      }
    }
  }

  async evaluatePolicy(policy) {
    // This would integrate with actual metrics
    // For now, it's a placeholder that demonstrates the logic
    
    // Check if cooldown period has passed
    if (policy.lastScalingAction) {
      const timeSinceLastAction = Date.now() - new Date(policy.lastScalingAction).getTime();
      if (timeSinceLastAction < policy.cooldownPeriod * 1000) {
        return; // Still in cooldown
      }
    }

    // In a real implementation, you would:
    // 1. Get current metrics for the target service
    // 2. Compare with thresholds
    // 3. Calculate required scaling
    // 4. Execute scaling if needed
    
    console.log(`Evaluating policy: ${policy.name}`);
  }
}

module.exports = new ScalingService();

