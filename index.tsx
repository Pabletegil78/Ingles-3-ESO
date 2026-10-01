import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Interceptor global para evitar pantallas en blanco silenciosas
window.addEventListener('error', (event) => {
  console.error("Global window error captured:", event.error);
  const container = document.getElementById('root');
  if (container && container.innerHTML.trim() === '') {
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; font-family: system-ui, sans-serif; padding: 20px;">
        <div style="background: white; border-radius: 24px; padding: 32px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <div style="font-size: 40px; margin-bottom: 12px;">🇬🇧</div>
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">English Quest 3º ESO</h2>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Pulsa el botón para cargar la aplicación limpiamente:</p>
          <button onclick="localStorage.clear(); window.location.reload();" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer;">
            Recargar Aplicación
          </button>
        </div>
      </div>
    `;
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
