// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { expect, vi } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';
import 'fake-indexeddb/auto';

expect.extend(matchers);

// Mock matchmedia when running in a browser-like environment
if (typeof window !== 'undefined') {
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {},
      } as unknown as MediaQueryList;
    };
}

// Prevent Firebase from initializing during tests

vi.mock('firebase/app', () => ({
  initializeApp: () => ({}),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({})
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: () => ({}),
  setDoc: async () => undefined,
}));

vi.mock('firebase/database', () => ({
  getDatabase: () => ({})
}));

vi.mock('firebase/storage', () => ({
  getStorage: () => ({})
}));
