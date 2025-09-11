// Browser-safe toast utilities

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  // Simple toast implementation - in a real app you'd use a toast library
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // You could also use the browser's notification API here
  if ('Notification' in window) {
    new Notification(message);
  }
}

export function showSuccess(message: string): void {
  showToast(message, 'success');
}

export function showError(message: string): void {
  showToast(message, 'error');
}

export function showInfo(message: string): void {
  showToast(message, 'info');
}