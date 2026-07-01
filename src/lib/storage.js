// Utility for safe storage access to avoid DOMException: "The operation is insecure"
// when localStorage/sessionStorage are blocked (e.g. by Firefox privacy settings/incognito mode)

const createSafeStorage = (type) => {
  const storeName = type === 'sessionStorage' ? 'sessionStorage' : 'localStorage';
  
  let isAvailable = false;
  try {
    const testKey = '__storage_test__';
    const storage = window[storeName];
    if (storage) {
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      isAvailable = true;
    }
  } catch (e) {
    isAvailable = false;
  }

  const fallbackStore = {};

  return {
    getItem(key) {
      if (isAvailable) {
        try {
          return window[storeName].getItem(key);
        } catch (e) {
          console.warn(`safeStorage: Failed to get item from ${storeName}:`, e);
        }
      }
      return Object.prototype.hasOwnProperty.call(fallbackStore, key) ? fallbackStore[key] : null;
    },
    setItem(key, value) {
      if (isAvailable) {
        try {
          window[storeName].setItem(key, value);
          return;
        } catch (e) {
          console.warn(`safeStorage: Failed to set item in ${storeName}:`, e);
        }
      }
      fallbackStore[key] = String(value);
    },
    removeItem(key) {
      if (isAvailable) {
        try {
          window[storeName].removeItem(key);
          return;
        } catch (e) {
          console.warn(`safeStorage: Failed to remove item from ${storeName}:`, e);
        }
      }
      delete fallbackStore[key];
    },
    clear() {
      if (isAvailable) {
        try {
          window[storeName].clear();
          return;
        } catch (e) {
          console.warn(`safeStorage: Failed to clear ${storeName}:`, e);
        }
      }
      for (const key in fallbackStore) {
        delete fallbackStore[key];
      }
    }
  };
};

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');
