const getDevApiUrl = () => {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return "";
  }

  return `${window.location.protocol}//${window.location.hostname}:3001`;
};

export const API_URL = import.meta.env.VITE_API_URL || getDevApiUrl();

export const assertApiUrl = () => {
  if (API_URL) {
    return true;
  }

  return false;
};
