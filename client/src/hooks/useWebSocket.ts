import { useState, useEffect, useRef } from "react";

export function useWebSocket(userId?: number): WebSocket | null {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Create WebSocket connection
    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setSocket(ws);
        
        // Clear any pending reconnect timeouts
        if (reconnectTimeoutRef.current !== null) {
          window.clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        setSocket(null);
        
        // Attempt to reconnect after a delay (exponential backoff could be implemented)
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connectWebSocket();
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      return ws;
    };
    
    const ws = connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId]);
  
  return socket;
}
