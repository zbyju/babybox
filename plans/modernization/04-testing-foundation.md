# Project 4: Testing Foundation

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Establish comprehensive test coverage as safety net |
| **Risk** | Low |
| **Effort** | 5-7 days |
| **Dependencies** | #1 Cleanup, #2 TypeScript, #3 ESM (recommended) |
| **Unlocks** | Confidence for all future changes |

## Why Now?

Testing should come before major changes because:
- Catches regressions during dependency updates
- Validates Bun migration doesn't break anything
- Enables confident refactoring
- Documents expected behavior

## Current State

| App | Test Files | Coverage |
|-----|------------|----------|
| Backend | 3 files | Minimal (utilities only) |
| Panel | 0 files | None |
| Configer | 0 files | None |
| Startup | 0 files | None (Jest configured) |

### Existing Tests

```
backend/src/utils/__tests__/url.test.ts      - actionToUrl function
backend/src/utils/__tests__/actions.test.ts  - stringToAction function
backend/src/types/__tests__/request.test.ts  - request validators
```

## Test Strategy

### What to Test

| Layer | Priority | What to Cover |
|-------|----------|---------------|
| Utilities | High | Pure functions (transformations, validations) |
| API Routes | High | Request/response contracts |
| State Logic | High | Panel state determination, connection tracking |
| Stores | Medium | Pinia store actions |
| Components | Low | Critical UI components only |
| E2E | Low | Defer until later |

### What NOT to Test (for now)

- Hardware communication (requires mocking units)
- Camera feeds (browser-specific)
- Sound playback (browser-specific)
- PM2 process management (integration test)

## Tasks

### 4.1 Backend Tests

#### Existing Tests - Verify Working
```bash
cd source/apps/backend && pnpm test
```

#### New Unit Tests

**`src/fetch/__tests__/fetchFromUnits.test.ts`**
```typescript
import { describe, it, expect, vi } from "vitest";
import axios from "axios";
import { fetchDataCommon } from "../fetchFromUnits.js";
import { Unit } from "../../types/units.types.js";

vi.mock("axios");

describe("fetchFromUnits", () => {
  describe("fetchDataCommon", () => {
    it("should fetch engine data with correct URL", async () => {
      // Mock config
      // Mock axios response
      // Verify correct URL called
    });

    it("should handle timeout", async () => {
      // Mock timeout error
      // Verify graceful handling
    });

    it("should handle network error", async () => {
      // Mock network error
      // Verify error response
    });
  });
});
```

**`src/routes/__tests__/engineRoute.test.ts`**
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { engineRoute } from "../engineRoute.js";

describe("Engine Route", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use("/api/v1/engine", engineRoute);
  });

  describe("GET /data", () => {
    it("should return engine data on success", async () => {
      // Mock hardware response
      const response = await request(app).get("/api/v1/engine/data");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should return 500 on hardware error", async () => {
      // Mock hardware failure
    });
  });
});
```

#### Integration Tests

**`src/__tests__/integration/config.test.ts`**
```typescript
describe("Config Loading", () => {
  it("should fetch config from configer service", async () => {
    // This requires configer to be running
    // Or mock the HTTP call
  });
});
```

### 4.2 Panel Tests

Switch from nonexistent tests to Vitest (already in devDeps).

**`src/utils/__tests__/conversions.test.ts`**
```typescript
import { describe, it, expect } from "vitest";
import { numberToVoltage, stringToVoltage } from "../panel/conversions";

describe("conversions", () => {
  describe("numberToVoltage", () => {
    it("should convert with default config", () => {
      const result = numberToVoltage(630, { divider: 63, multiplier: 100, addition: 0 });
      expect(result).toBe(10.0);
    });

    it("should handle zero", () => {
      expect(numberToVoltage(0, { divider: 63, multiplier: 100, addition: 0 })).toBe(0);
    });

    it("should apply addition", () => {
      const result = numberToVoltage(630, { divider: 63, multiplier: 100, addition: 5 });
      expect(result).toBe(15.0);
    });
  });
});
```

**`src/defaults/__tests__/units.defaults.test.ts`** (CRITICAL)
```typescript
import { describe, it, expect } from "vitest";
import { rawEngineUnitToEngineUnit, rawThermalUnitToThermalUnit } from "../units.defaults";

describe("Unit Data Parsing", () => {
  describe("rawEngineUnitToEngineUnit", () => {
    it("should parse valid engine data", () => {
      const raw = [
        { index: 0, value: "0" },   // blockValue
        { index: 1, value: "100" }, // leftMotorLoad
        // ... more fields
      ];
      
      const result = rawEngineUnitToEngineUnit(raw);
      
      expect(result.blockValue).toBe(0);
      expect(result.leftMotorLoad).toBe(100);
    });

    it("should handle missing values gracefully", () => {
      const raw = [{ index: 0, value: "0" }];
      const result = rawEngineUnitToEngineUnit(raw);
      expect(result).toBeDefined();
    });
  });
});
```

**`src/logic/panel/__tests__/state.test.ts`** (CRITICAL)
```typescript
import { describe, it, expect } from "vitest";
import { getNewState, isActiveByBlockValue } from "../state";

describe("Panel State Determination", () => {
  describe("isActiveByBlockValue", () => {
    it("should detect activation state", () => {
      // blockValue 1 = activated
      expect(isActiveByBlockValue(1)).toBe(true);
      expect(isActiveByBlockValue(0)).toBe(false);
    });
  });

  describe("getNewState", () => {
    it("should return activation message when active", () => {
      const engine = { blockValue: 1, /* ... */ };
      const thermal = { /* ... */ };
      
      const state = getNewState(engine, thermal);
      
      expect(state.active).toBe(true);
      expect(state.message).toContain("AKTIVN");
    });

    it("should detect door opening", () => {
      // Test door states
    });
  });
});
```

**`src/pinia/__tests__/unitsStore.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUnitsStore } from "../unitsStore";

describe("Units Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should set engine unit data", () => {
    const store = useUnitsStore();
    
    store.setEngineUnit({
      blockValue: 0,
      leftMotorLoad: 100,
      // ...
    });

    expect(store.engineUnit?.blockValue).toBe(0);
  });
});
```

### 4.3 Configer Tests

**`src/routes/__tests__/configRoute.test.ts`**
```typescript
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { configRoute } from "../configRoute.js";

describe("Config Route", () => {
  describe("GET /main", () => {
    it("should return main config", async () => {
      // ...
    });
  });

  describe("PUT /main", () => {
    it("should update config with valid data", async () => {
      // ...
    });

    it("should reject invalid config", async () => {
      // ...
    });
  });
});
```

### 4.4 Test Configuration

#### Vitest for Panel

`source/apps/panel/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", "dist", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

#### Backend Test Config

If staying with Jest, update for ESM. Or migrate to Vitest:

`source/apps/backend/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

### 4.5 CI Test Script

Add to root `package.json`:
```json
{
  "scripts": {
    "test": "pnpm -r test",
    "test:coverage": "pnpm -r test:coverage"
  }
}
```

## Test Coverage Goals

| Component | Target | Notes |
|-----------|--------|-------|
| Unit data parsing | 90%+ | Critical for correctness |
| State determination | 90%+ | Complex logic, high risk |
| Voltage conversions | 100% | Simple but critical |
| API validators | 80%+ | Input validation |
| Store actions | 70%+ | State management |
| Route handlers | 60%+ | Integration points |

## Verification

```bash
# Run all tests
cd source && pnpm test

# Run with coverage
cd source && pnpm test:coverage

# Run specific app
cd source/apps/panel && pnpm test
```

## Files to Create

```
backend/src/fetch/__tests__/fetchFromUnits.test.ts
backend/src/routes/__tests__/engineRoute.test.ts
backend/src/routes/__tests__/thermalRoute.test.ts
backend/vitest.config.ts (if migrating from Jest)

panel/src/utils/__tests__/conversions.test.ts
panel/src/defaults/__tests__/units.defaults.test.ts
panel/src/logic/panel/__tests__/state.test.ts
panel/src/logic/panel/__tests__/tables.test.ts
panel/src/pinia/__tests__/unitsStore.test.ts
panel/vitest.config.ts (update existing)

configer/src/routes/__tests__/configRoute.test.ts
configer/vitest.config.ts
```

## Rollback

Tests are additive - no rollback needed. If tests fail:
- Fix the code (tests reveal bugs)
- Or skip/fix the test if it's incorrect
