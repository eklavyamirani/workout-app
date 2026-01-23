export const storage = {
  async get(key: string) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  async set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  async delete(key: string) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  },

  async list(prefix: string = '') {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('Storage list error:', error);
      return [];
    }
  }
};
