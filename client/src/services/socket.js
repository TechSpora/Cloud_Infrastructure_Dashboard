import { io } from 'socket.io-client'

const SOCKET_URL = process.env.VUE_APP_SOCKET_URL || 'http://localhost:3000'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
  }

  connect() {
    if (this.socket && this.connected) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    })

    this.socket.on('connect', () => {
      this.connected = true
      console.log('Connected to server')
    })

    this.socket.on('disconnect', () => {
      this.connected = false
      console.log('Disconnected from server')
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export default new SocketService()

