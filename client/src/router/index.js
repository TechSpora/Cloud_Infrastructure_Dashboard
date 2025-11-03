import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Monitoring from '../views/Monitoring.vue'
import Scaling from '../views/Scaling.vue'
import Costs from '../views/Costs.vue'
import Alerts from '../views/Alerts.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/monitoring',
    name: 'Monitoring',
    component: Monitoring
  },
  {
    path: '/scaling',
    name: 'Scaling',
    component: Scaling
  },
  {
    path: '/costs',
    name: 'Costs',
    component: Costs
  },
  {
    path: '/alerts',
    name: 'Alerts',
    component: Alerts
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router

