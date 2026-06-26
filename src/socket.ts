import { Server as SocketServer } from 'socket.io'
import { Server } from 'http'

let io: SocketServer

export const initSocket = (server: Server) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  })
  return io
}

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized')
  }
  return io
}