// Type augmentation for testing-library jest-dom matchers in Vitest
// This file is needed because tsc doesn't process setup.ts imports for type augmentation
// and the __tests__/ directory is excluded from tsconfig.json
import "@testing-library/jest-dom/vitest";
