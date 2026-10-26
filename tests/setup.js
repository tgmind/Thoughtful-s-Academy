import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = function (query) {
      return {
        matches: query.includes('1024') ? (window.innerWidth >= 1024) : false,
        media: query,
        onchange: null,
        addListener: function () {},
        removeListener: function () {},
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () { return true },
      }
    }
  }

  if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
    let store = {}
    const storageMock = {
      getItem: vi.fn((key) => (key in store ? store[key] : null)),
      setItem: vi.fn((key, value) => {
        store[key] = String(value)
      }),
      removeItem: vi.fn((key) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    })
  }
}
