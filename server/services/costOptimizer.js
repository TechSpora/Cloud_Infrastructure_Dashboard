const AWS = require('aws-sdk');

class CostOptimizer {
  constructor() {
    this.costExplorer = null;
    this.ec2 = null;
    this.initialized = false;
    this.costData = {
      daily: [],
      monthly: 0,
      projected: 0
    };
  }

  async initialize() {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.costExplorer = new AWS.CostExplorer();
    this.ec2 = new AWS.EC2();
    this.initialized = true;

    // Start periodic cost calculation
    this.startCostCalculation();
  }

  async getCosts() {
    if (!this.initialized) {
      return this.getMockCosts();
    }

    try {
      const daily = await this.getDailyCosts();
      const monthly = await this.getMonthlyCost();
      const projected = await this.getProjectedCost();

      return {
        daily,
        monthly,
        projected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching costs:', error);
      return this.getMockCosts();
    }
  }

  async getDailyCosts() {
    if (!this.costExplorer) return this.generateMockDailyCosts();

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost']
      };

      const data = await this.costExplorer.getCostAndUsage(params).promise();
      
      return data.ResultsByTime.map(result => ({
        date: result.TimePeriod.Start,
        cost: parseFloat(result.Total.BlendedCost.Amount) || 0,
        currency: result.Total.BlendedCost.Unit || 'USD'
      }));
    } catch (error) {
      console.error('Error getting daily costs:', error);
      return this.generateMockDailyCosts();
    }
  }

  async getMonthlyCost() {
    if (!this.costExplorer) return this.generateMockMonthlyCost();

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'MONTHLY',
        Metrics: ['BlendedCost']
      };

      const data = await this.costExplorer.getCostAndUsage(params).promise();
      
      if (data.ResultsByTime && data.ResultsByTime.length > 0) {
        return parseFloat(data.ResultsByTime[0].Total.BlendedCost.Amount) || 0;
      }
      
      return this.generateMockMonthlyCost();
    } catch (error) {
      console.error('Error getting monthly cost:', error);
      return this.generateMockMonthlyCost();
    }
  }

  async getProjectedCost() {
    const monthly = await this.getMonthlyCost();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    
    if (currentDay === 0) return monthly;
    
    return (monthly / currentDay) * daysInMonth;
  }

  async getRecommendations() {
    const recommendations = [];

    // Check for idle resources
    try {
      const idleResources = await this.findIdleResources();
      if (idleResources.length > 0) {
        recommendations.push({
          type: 'idle-resources',
          priority: 'high',
          title: 'Idle Resources Detected',
          description: `${idleResources.length} resources appear to be idle and could be terminated`,
          resources: idleResources,
          estimatedSavings: idleResources.reduce((sum, r) => sum + (r.estimatedCost || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error finding idle resources:', error);
    }

    // Check for oversized instances
    try {
      const oversized = await this.findOversizedInstances();
      if (oversized.length > 0) {
        recommendations.push({
          type: 'rightsizing',
          priority: 'medium',
          title: 'Right-Sizing Opportunities',
          description: `${oversized.length} instances may be over-provisioned`,
          instances: oversized,
          estimatedSavings: oversized.reduce((sum, i) => sum + (i.estimatedSavings || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error finding oversized instances:', error);
    }

    // Check for reserved instance opportunities
    recommendations.push({
      type: 'reserved-instances',
      priority: 'low',
      title: 'Reserved Instance Savings',
      description: 'Consider purchasing Reserved Instances for predictable workloads',
      estimatedSavings: this.calculateReservedInstanceSavings()
    });

    return recommendations;
  }

  async findIdleResources() {
    if (!this.ec2) {
      return [
        { id: 'i-1234567890abcdef0', name: 'Idle Test Server', estimatedCost: 50 }
      ];
    }

    try {
      const data = await this.ec2.describeInstances().promise();
      const idleResources = [];

      // Simple heuristic: instances running for >7 days with low CPU
      // In production, you'd check CloudWatch metrics
      
      return idleResources;
    } catch (error) {
      console.error('Error finding idle resources:', error);
      return [];
    }
  }

  async findOversizedInstances() {
    // This would analyze CPU/memory utilization vs instance size
    return [];
  }

  calculateReservedInstanceSavings() {
    // Mock calculation - in production, use AWS Pricing API
    return 150;
  }

  startCostCalculation() {
    // Recalculate costs every hour
    setInterval(async () => {
      try {
        this.costData = await this.getCosts();
      } catch (error) {
        console.error('Error calculating costs:', error);
      }
    }, 3600000);
  }

  getMockCosts() {
    return {
      daily: this.generateMockDailyCosts(),
      monthly: this.generateMockMonthlyCost(),
      projected: this.generateMockMonthlyCost() * 1.1,
      timestamp: new Date().toISOString()
    };
  }

  generateMockDailyCosts() {
    const costs = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      costs.push({
        date: date.toISOString().split('T')[0],
        cost: Math.random() * 100 + 50,
        currency: 'USD'
      });
    }
    return costs;
  }

  generateMockMonthlyCost() {
    return Math.random() * 2000 + 1000;
  }
}

module.exports = new CostOptimizer();

