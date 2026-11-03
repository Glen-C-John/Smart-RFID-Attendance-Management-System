import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastScanEvent, setLastScanEvent] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  useEffect(() => {
    // Connect to backend relative URL via Vite proxy or current host
    const socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to backend server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from backend');
      setIsConnected(false);
    });

    socketInstance.on('attendance:scan', (event) => {
      console.log('[Socket.IO] Real-time scan received:', event);
      setLastScanEvent(event);

      // Trigger temporary banner toast
      const notifId = Date.now();
      setToastNotification({
        id: notifId,
        ...event,
      });

      // Auto dismiss toast after 5 seconds
      setTimeout(() => {
        setToastNotification((current) => (current?.id === notifId ? null : current));
      }, 5000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const dismissToast = () => setToastNotification(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        lastScanEvent,
        toastNotification,
        dismissToast,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
