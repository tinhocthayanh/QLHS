/**
 * StorageAdapter – lớp trừu tượng cho phép thay thế backend lưu trữ.
 * Hiện tại có LocalStorageAdapter (mặc định) và MemoryAdapter.
 * Tương lai có thể viết FirebaseAdapter / SupabaseAdapter cùng interface.
 */

export class LocalStorageAdapter {
  constructor(prefix = 'classstar_') { this.prefix = prefix; }
  async get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('LocalStorage read error:', e);
      return fallback;
    }
  }
  async set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('LocalStorage write error:', e);
      throw new Error('Bộ nhớ trình duyệt đã đầy. Hãy xoá dữ liệu cũ.');
    }
  }
  async remove(key) { localStorage.removeItem(this.prefix + key); }
  async clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
    keys.forEach(k => localStorage.removeItem(k));
  }
  async export() {
    const out = {};
    Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => {
      try { out[k.slice(this.prefix.length)] = JSON.parse(localStorage.getItem(k)); } catch {}
    });
    return out;
  }
  async importAll(obj) {
    await this.clear();
    for (const [k, v] of Object.entries(obj || {})) {
      localStorage.setItem(this.prefix + k, JSON.stringify(v));
    }
  }
}

export class MemoryAdapter {
  constructor() { this.map = new Map(); }
  async get(k, f = null) { return this.map.has(k) ? this.map.get(k) : f; }
  async set(k, v) { this.map.set(k, v); return true; }
  async remove(k) { this.map.delete(k); }
  async clear() { this.map.clear(); }
  async export() { return Object.fromEntries(this.map); }
  async importAll(o) { this.map = new Map(Object.entries(o || {})); }
}

// Adapter mặc định
export const storage = new LocalStorageAdapter();