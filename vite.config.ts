/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom gives tests the browser globals the store depends on:
    // sessionStorage (persist middleware) and crypto.randomUUID (session slice).
    environment: 'jsdom',
    // Expose describe/it/expect without imports, matching the Zustand docs.
    globals: true,
    // Runs once before each test file: resets the store to its initial state
    // and clears sessionStorage so no test leaks soft data into the next.
    setupFiles: ['./src/test/setup.ts'],
  },
})
