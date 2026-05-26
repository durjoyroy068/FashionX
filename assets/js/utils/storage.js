const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`fashionx_${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`fashionx_${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(`fashionx_${key}`);
  }
};

export default Storage;
