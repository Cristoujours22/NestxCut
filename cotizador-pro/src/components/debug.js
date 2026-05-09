// Debug helper - open DevTools automatically to catch errors
window.addEventListener('error', (e) => {
  console.error('Global error:', e.message, e.stack);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
console.log('Settings loaded, API available:', !!window.electronAPI);