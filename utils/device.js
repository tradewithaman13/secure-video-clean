// utils/device.js
export function getDeviceId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('device_id');
  if (!id) {
    if (crypto && crypto.randomUUID) id = crypto.randomUUID();
    else id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('device_id', id);
  }
  return id;
}
