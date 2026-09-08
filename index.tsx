
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CourseProvider } from './contexts/CourseContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Global Error Handler for Chunk Loading (Fixes "Failed to fetch dynamically imported module")
window.addEventListener('error', (event) => {
  const isChunkError =
    /Loading chunk [\d]+ failed/.test(event.message) ||
    /Loading CSS chunk [\d]+ failed/.test(event.message) ||
    /Failed to fetch dynamically imported module/.test(event.message);

  if (isChunkError) {
    console.error('🕸️ Chunk load error detected. Force reloading...', event);
    event.preventDefault();
    window.location.reload();
  }
});

// CLEANUP: Force unregister Service Workers to avoid stale cache issues in Dev
// NOTE: Commented out to allow VitePWA to manage the Service Worker correctly
/*
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      console.log('🧹 Unregistering stale Service Worker:', registration);
      registration.unregister();
    }
  });
}
*/

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <CourseProvider>
              <App />
            </CourseProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
