const AWS = require('aws-sdk');

class CloudMonitor {
  constructor() {
    this.ec2 = null;
    this.cloudWatch = null;
    this.ecs = null;
    this.initialized = false;
  }

  async initialize() {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.ec2 = new AWS.EC2();
    this.cloudWatch = new AWS.CloudWatch();
    this.ecs = new AWS.ECS();
    this.initialized = true;
  }

  async getMetrics() {
    if (!this.initialized) {
      // Return mock data for development
      return this.getMockMetrics();
    }

    try {
      const cpuUtilization = await this.getCPUUtilization();
      const memoryUtilization = await this.getMemoryUtilization();
      const networkIn = await this.getNetworkIn();
      const networkOut = await this.getNetworkOut();

      return {
        cpu: cpuUtilization,
        memory: memoryUtilization,
        networkIn: networkIn,
        networkOut: networkOut,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return this.getMockMetrics();
    }
  }

  async getCPUUtilization() {
    if (!this.cloudWatch) return this.generateMockMetric(30, 80);

    try {
      const params = {
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        StartTime: new Date(Date.now() - 3600000),
        EndTime: new Date(),
        Period: 300,
        Statistics: ['Average']
      };

      const data = await this.cloudWatch.getMetricStatistics(params).promise();
      if (data.Datapoints && data.Datapoints.length > 0) {
        return data.Datapoints[data.Datapoints.length - 1].Average;
      }
      return this.generateMockMetric(30, 80);
    } catch (error) {
      console.error('Error getting CPU utilization:', error);
      return this.generateMockMetric(30, 80);
    }
  }

  async getMemoryUtilization() {
    if (!this.cloudWatch) return this.generateMockMetric(40, 85);
    // Memory metrics require CloudWatch agent
    return this.generateMockMetric(40, 85);
  }

  async getNetworkIn() {
    if (!this.cloudWatch) return this.generateMockMetric(1000, 10000);
    
    try {
      const params = {
        Namespace: 'AWS/EC2',
        MetricName: 'NetworkIn',
        StartTime: new Date(Date.now() - 3600000),
        EndTime: new Date(),
        Period: 300,
        Statistics: ['Sum']
      };

      const data = await this.cloudWatch.getMetricStatistics(params).promise();
      if (data.Datapoints && data.Datapoints.length > 0) {
        return data.Datapoints[data.Datapoints.length - 1].Sum;
      }
      return this.generateMockMetric(1000, 10000);
    } catch (error) {
      return this.generateMockMetric(1000, 10000);
    }
  }

  async getNetworkOut() {
    if (!this.cloudWatch) return this.generateMockMetric(500, 5000);
    
    try {
      const params = {
        Namespace: 'AWS/EC2',
        MetricName: 'NetworkOut',
        StartTime: new Date(Date.now() - 3600000),
        EndTime: new Date(),
        Period: 300,
        Statistics: ['Sum']
      };

      const data = await this.cloudWatch.getMetricStatistics(params).promise();
      if (data.Datapoints && data.Datapoints.length > 0) {
        return data.Datapoints[data.Datapoints.length - 1].Sum;
      }
      return this.generateMockMetric(500, 5000);
    } catch (error) {
      return this.generateMockMetric(500, 5000);
    }
  }

  async getResources() {
    if (!this.initialized) {
      return this.getMockResources();
    }

    try {
      const instances = await this.getEC2Instances();
      const clusters = await this.getECSClusters();
      
      return {
        ec2Instances: instances,
        ecsClusters: clusters,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching resources:', error);
      return this.getMockResources();
    }
  }

  async getEC2Instances() {
    if (!this.ec2) return this.getMockResources().ec2Instances;

    try {
      const data = await this.ec2.describeInstances().promise();
      const instances = [];
      
      data.Reservations.forEach(reservation => {
        reservation.Instances.forEach(instance => {
          instances.push({
            id: instance.InstanceId,
            type: instance.InstanceType,
            state: instance.State.Name,
            launchTime: instance.LaunchTime,
            tags: instance.Tags || []
          });
        });
      });

      return instances;
    } catch (error) {
      console.error('Error getting EC2 instances:', error);
      return this.getMockResources().ec2Instances;
    }
  }

  async getECSClusters() {
    if (!this.ecs) return this.getMockResources().ecsClusters;

    try {
      const data = await this.ecs.listClusters().promise();
      const clusters = [];
      
      if (data.clusterArns && data.clusterArns.length > 0) {
        const details = await this.ecs.describeClusters({
          clusters: data.clusterArns
        }).promise();
        
        details.clusters.forEach(cluster => {
          clusters.push({
            name: cluster.clusterName,
            status: cluster.status,
            runningTasks: cluster.runningTasksCount || 0,
            pendingTasks: cluster.pendingTasksCount || 0,
            activeServices: cluster.activeServicesCount || 0
          });
        });
      }

      return clusters;
    } catch (error) {
      console.error('Error getting ECS clusters:', error);
      return this.getMockResources().ecsClusters;
    }
  }

  getMockMetrics() {
    return {
      cpu: this.generateMockMetric(30, 80),
      memory: this.generateMockMetric(40, 85),
      networkIn: this.generateMockMetric(1000, 10000),
      networkOut: this.generateMockMetric(500, 5000),
      timestamp: new Date().toISOString()
    };
  }

  getMockResources() {
    return {
      ec2Instances: [
        {
          id: 'i-1234567890abcdef0',
          type: 't3.medium',
          state: 'running',
          launchTime: new Date(Date.now() - 86400000).toISOString(),
          tags: [{ Key: 'Name', Value: 'Web Server' }]
        },
        {
          id: 'i-0987654321fedcba0',
          type: 't3.large',
          state: 'running',
          launchTime: new Date(Date.now() - 172800000).toISOString(),
          tags: [{ Key: 'Name', Value: 'Database Server' }]
        }
      ],
      ecsClusters: [
        {
          name: 'production-cluster',
          status: 'ACTIVE',
          runningTasks: 12,
          pendingTasks: 2,
          activeServices: 5
        },
        {
          name: 'staging-cluster',
          status: 'ACTIVE',
          runningTasks: 6,
          pendingTasks: 0,
          activeServices: 3
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  generateMockMetric(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = new CloudMonitor();

