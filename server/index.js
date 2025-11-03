const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const cloudMonitor = require('./services/cloudMonitor');
const scalingService = require('./services/scalingService');
const costOptimizer = require('./services/costOptimizer');
const alertService = require('./services/alertService');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await cloudMonitor.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/resources', async (req, res) => {
  try {
    const resources = await cloudMonitor.getResources();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scaling/manual', async (req, res) => {
  try {
    const { serviceId, action, count } = req.body;
    const result = await scalingService.manualScale(serviceId, action, count);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scaling/policies', async (req, res) => {
  try {
    const policies = await scalingService.getPolicies();
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scaling/policies', async (req, res) => {
  try {
    const policy = req.body;
    const result = await scalingService.createPolicy(policy);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/costs', async (req, res) => {
  try {
    const costs = await costOptimizer.getCosts();
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/costs/recommendations', async (req, res) => {
  try {
    const recommendations = await costOptimizer.getRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await alertService.getAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const alert = req.body;
    const result = await alertService.createAlert(alert);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const result = await alertService.updateAlert(id, updates);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast real-time metrics every 5 seconds
setInterval(async () => {
  try {
    const metrics = await cloudMonitor.getMetrics();
    const resources = await cloudMonitor.getResources();
    const costs = await costOptimizer.getCosts();
    const alerts = await alertService.getActiveAlerts();

    io.emit('metrics', metrics);
    io.emit('resources', resources);
    io.emit('costs', costs);
    io.emit('alerts', alerts);
  } catch (error) {
    console.error('Error broadcasting metrics:', error);
  }
}, 5000);

// Initialize services
async function initialize() {
  try {
    await cloudMonitor.initialize();
    await scalingService.initialize();
    await costOptimizer.initialize();
    await alertService.initialize();
    console.log('All services initialized');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initialize();
});

