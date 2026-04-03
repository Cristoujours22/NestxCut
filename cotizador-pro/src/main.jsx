// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// Use HashRouter for easier compatibility with Electron's file:// protocol in production
import { HashRouter } from 'react-router-dom';
import App from './App'; // Your main App component
import { AuthProvider } from './context/AuthContext'; // Import the Auth Provider
import './index.css'; // Global styles

// Get the root element
const rootElement = document.getElementById('root');

// Ensure the root element exists
if (!rootElement) {
  throw new Error("Failed to find the root element with ID 'root'");
}

// Create the React root
const root = ReactDOM.createRoot(rootElement);

// Render the application
root.render(
  <React.StrictMode>
    {/* HashRouter is often recommended for Electron apps */}
    <HashRouter>
      {/* Wrap the entire application with the AuthProvider */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
