import { defineConfig } from 'vitest/config';
export default defineConfig({test:{testTimeout:20000,include:['src/tests/**/*.test.ts'],maxWorkers:2}});
