import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; 
import App from './App'; 

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra o Service Worker (PWA instalável + offline) só em produção
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* ignora falha de registro */ });
  });
}