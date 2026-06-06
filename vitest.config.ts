import { defineConfig } from 'vitest/config';

// 純粋ロジック（modes/ や shared/）は DOM 非依存なので node 環境でテストする。
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/modes/**', 'src/shared/**', 'src/store/**', 'src/versus/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
