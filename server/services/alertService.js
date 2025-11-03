const fs = require('fs').promises;
const path = require('path');

class AlertService {
  constructor() {
    this.alertsFile = path.join(__dirname, '../data/alerts.json');
    this.alerts = [];
    this.rulesFile = path.join(__dirname, '../data/alert-rules.json');
    this.rules = [];
    this.initialized = false;
  }

  async initialize() {
    await this.loadAlerts();
    await this.loadRules();
    
    // Start monitoring
    this.startMonitoring();
    
    this.initialized = true;
  }

  async loadAlerts() {
    try {
      await fs.mkdir(path.dirname(this.alertsFile), { recursive: true });
      const data = await fs.readFile(this.alertsFile, 'utf8');
      this.alerts = JSON.parse(data);
    } catch (error) {
      this.alerts = [];
    }
  }

  async saveAlerts() {
    try {
      await fs.writeFile(this.alertsFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  }

  async loadRules() {
    try {
      await fs.mkdir(path.dirname(this.rulesFile), { recursive: true });
      const data = await fs.readFile(this.rulesFile, 'utf8');
      this.rules = JSON.parse(data);
    } catch (error) {
      this.rules = this.getDefaultRules();
      await this.saveRules();
    }
  }

  async saveRules() {
    try {
      await fs.writeFile(this.rulesFile, JSON.stringify(this.rules, null, 2));
    } catch (error) {
      console.error('Error saving rules:', error);
    }
  }

  getDefaultRules() {
    return [
      {
        id: 'rule-1',
        name: 'High CPU Usage',
        enabled: true,
        metric: 'cpu',
        threshold: 85,
        operator: '>',
        severity: 'warning',
        action: 'notify'
      },
      {
        id: 'rule-2',
        name: 'High Memory Usage',
        enabled: true,
        metric: 'memory',
        threshold: 90,
        operator: '>',
        severity: 'critical',
        action: 'notify'
      },
      {
        id: 'rule-3',
        name: 'Cost Threshold',
        enabled: true,
        metric: 'cost',
        threshold: 5000,
        operator: '>',
        severity: 'warning',
        action: 'notify'
      }
    ];
  }

  async getAlerts() {
    return this.alerts;
  }

  async getActiveAlerts() {
    return this.alerts.filter(alert => alert.status === 'active');
  }

  async createAlert(alertData) {
    const alert = {
      id: `alert-${Date.now()}`,
      ...alertData,
      status: alertData.status || 'active',
      createdAt: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.unshift(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    await this.saveAlerts();
    return alert;
  }

  async updateAlert(alertId, updates) {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index === -1) {
      throw new Error('Alert not found');
    }

    this.alerts[index] = {
      ...this.alerts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveAlerts();
    return this.alerts[index];
  }

  async acknowledgeAlert(alertId) {
    return await this.updateAlert(alertId, { acknowledged: true });
  }

  async resolveAlert(alertId) {
    return await this.updateAlert(alertId, { status: 'resolved' });
  }

  async checkMetrics(metrics) {
    const enabledRules = this.rules.filter(r => r.enabled);

    for (const rule of enabledRules) {
      await this.evaluateRule(rule, metrics);
    }
  }

  async evaluateRule(rule, metrics) {
    let value;
    
    switch (rule.metric) {
      case 'cpu':
        value = metrics.cpu;
        break;
      case 'memory':
        value = metrics.memory;
        break;
      case 'cost':
        // Would need cost data
        return;
      default:
        return;
    }

    let triggered = false;
    
    switch (rule.operator) {
      case '>':
        triggered = value > rule.threshold;
        break;
      case '<':
        triggered = value < rule.threshold;
        break;
      case '>=':
        triggered = value >= rule.threshold;
        break;
      case '<=':
        triggered = value <= rule.threshold;
        break;
      case '==':
        triggered = value === rule.threshold;
        break;
    }

    if (triggered) {
      // Check if alert already exists for this rule
      const existingAlert = this.alerts.find(
        a => a.ruleId === rule.id && a.status === 'active'
      );

      if (!existingAlert) {
        await this.createAlert({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
          metric: rule.metric,
          value: value,
          threshold: rule.threshold
        });
      }
    }
  }

  startMonitoring() {
    // This would be called periodically with actual metrics
    // For now, it's a placeholder
    setInterval(() => {
      // Monitoring logic runs when metrics are received via checkMetrics()
    }, 60000);
  }
}

module.exports = new AlertService();

