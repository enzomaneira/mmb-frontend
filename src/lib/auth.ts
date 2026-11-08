import { useSyncExternalStore } from "react";

const TOKEN_KEY = "mmb_access_token";

const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let currentToken = read();

function write(token: string | null) {
  currentToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // sem armazenamento: o login vale até a página ser fechada
  }
  listeners.forEach((listener) => listener());
}

export const getToken = () => currentToken;
export const saveToken = (token: string) => write(token);
export const clearToken = () => write(null);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, getToken);
}
