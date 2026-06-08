import { useCallback, useEffect, useRef, useState } from 'react'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket(userId, accessToken) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const socketRef = useRef(null)
  const reconnectRef = useRef(null)
  const pingRef = useRef(null)
  const shouldReconnectRef = useRef(true)

  const cleanupTimers = useCallback(() => {
    if (reconnectRef.current) window.clearTimeout(reconnectRef.current)
    if (pingRef.current) window.clearInterval(pingRef.current)
    reconnectRef.current = null
    pingRef.current = null
  }, [])

  const sendMessage = useCallback((data) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(data))
    return true
  }, [])

  useEffect(() => {
    if (!userId || !accessToken) {
      setIsConnected(false)
      return undefined
    }

    shouldReconnectRef.current = true

    const connect = () => {
      cleanupTimers()
      const socket = new WebSocket(`${WS_BASE_URL}/${userId}?token=${encodeURIComponent(accessToken)}`)
      socketRef.current = socket

      socket.onopen = () => {
        setIsConnected(true)
        pingRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }))
        }, 25000)
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'ping' && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'pong' }))
          }
          setLastMessage(message)
        } catch {
          setLastMessage({ type: 'message', data: event.data })
        }
      }

      socket.onclose = () => {
        setIsConnected(false)
        if (pingRef.current) window.clearInterval(pingRef.current)
        if (shouldReconnectRef.current) {
          reconnectRef.current = window.setTimeout(connect, 3000)
        }
      }

      socket.onerror = () => {
        socket.close()
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      cleanupTimers()
      if (socketRef.current) socketRef.current.close()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [accessToken, cleanupTimers, userId])

  return { isConnected, lastMessage, sendMessage }
}
