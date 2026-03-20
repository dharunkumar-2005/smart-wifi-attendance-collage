
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Show runtime errors directly in the page for easier debugging
window.addEventListener('error', (event) => {
  const message = event.error ? event.error.stack || event.error.message : event.message;
  document.body.innerHTML = `<pre style="padding:20px;font-family:system-ui, sans-serif;color:#ff4d4d;background:#000;white-space:pre-wrap;">Runtime Error:\n${message}</pre>`;
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason ? (event.reason.stack || event.reason) : 'Unknown';
  document.body.innerHTML = `<pre style="padding:20px;font-family:system-ui, sans-serif;color:#ff4d4d;background:#000;white-space:pre-wrap;">Unhandled Promise Rejection:\n${reason}</pre>`;
});

// Verify root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found! Check index.html for <div id="root"></div>');
  throw new Error('Could not find root element with id="root"');
}

// Create and render React root
const root = ReactDOM.createRoot(rootElement);
console.log('✅ React root created successfully');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ App rendered successfully');
