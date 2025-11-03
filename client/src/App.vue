<template>
  <div id="app">
    <nav class="navbar">
      <div class="navbar-brand">
        <h1>☁️ Cloud Infrastructure Dashboard</h1>
      </div>
      <div class="navbar-links">
        <router-link to="/" class="nav-link">Dashboard</router-link>
        <router-link to="/monitoring" class="nav-link">Monitoring</router-link>
        <router-link to="/scaling" class="nav-link">Auto-Scaling</router-link>
        <router-link to="/costs" class="nav-link">Costs</router-link>
        <router-link to="/alerts" class="nav-link">Alerts</router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.navbar-brand h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.navbar-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background 0.3s;
}

.nav-link:hover {
  background: rgba(255,255,255,0.2);
}

.nav-link.router-link-active {
  background: rgba(255,255,255,0.3);
  font-weight: 600;
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>

