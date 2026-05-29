/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MANAGER_ADDRESS?: string;
}


declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: "accountsChanged", listener: (accounts: string[]) => void) => void;
      on: (event: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}

export {};
