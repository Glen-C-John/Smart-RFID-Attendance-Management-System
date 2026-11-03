import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastScanEvent, setLastScanEvent] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('rfid_auth_token');
    if (!isAuthenticated || !token) {
      setIsConnected(false);
      return;
    }

    // Connect to backend relative URL via Vite proxy or current host with JWT auth
    const socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to backend server');
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket.IO] Authentication or connection error:', err.message);
      setIsConnected(false);
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
  }, [isAuthenticated]);

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
