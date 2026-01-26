import '@testing-library/jest-dom'

// Mock crypto.randomUUID for node environment
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2)
    }
  })
}
