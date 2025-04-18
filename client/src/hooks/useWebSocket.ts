import { useState, useEffect, useRef, useCallback } from "react";

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const {
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError
  } = options;

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Create WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      // Get the current user ID from local storage if available
      const storedUser = localStorage.getItem('currentUser');
      const userId = storedUser ? JSON.parse(storedUser).id : null;
      
      if (!userId) {
        console.log('No user ID available for WebSocket connection');
        return;
      }

      // Create WebSocket connection with correct protocol
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = (event) => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setReconnectAttempts(0);
        if (onOpen) onOpen(event);
      };
      
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        setLastMessage(event);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        if (onClose) onClose(event);
        
        // Attempt to reconnect if not a clean close
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
          
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, reconnectInterval);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (onError) onError(event);
      };
      
      socketRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval, onOpen, onClose, onError]);
  
  // Send message through WebSocket
  const sendMessage = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);
  
  // Connect when component mounts, reconnect when user changes
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);
  
  return {
    lastMessage,
    isConnected,
    sendMessage,
    reconnectAttempts
  };
}