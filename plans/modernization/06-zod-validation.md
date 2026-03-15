# Project 6: Zod Validation

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Add runtime type validation with Zod |
| **Risk** | Low |
| **Effort** | 3-4 days |
| **Dependencies** | #2 TypeScript, #5 Dependency Updates |
| **Unlocks** | Runtime safety, better error messages, API documentation |
| **Status** | **COMPLETE** |

## Why Zod?

Currently the codebase has manual type guards like:
```typescript
export function isInstanceOfMainConfig(obj: any): obj is MainConfig {
  return (
    "babybox" in obj &&
    "backend" in obj &&
    // ... many more checks
  );
}
```

Problems:
- Easy to forget a field
- No detailed error messages
- Duplicates type definitions
- No automatic inference

Zod provides:
- Schema-first definitions
- Automatic TypeScript types
- Detailed error messages
- Parsing and validation in one step

## Tasks

### 6.1 Install Zod

```bash
cd source
pnpm -F babybox-panel-backend add zod
pnpm -F babybox-panel-configer add zod
pnpm -F babybox-panel add zod
```

### 6.2 Configuration Schemas

Create `source/apps/backend/src/schemas/config.schema.ts`:

```typescript
import { z } from "zod";

export const BabyboxConfigSchema = z.object({
  name: z.string(),
});

export const BackendConfigSchema = z.object({
  url: z.string(),
  port: z.number().int().positive(),
  requestTimeout: z.number().int().positive(),
});

export const ConfigerConfigSchema = z.object({
  url: z.string(),
  port: z.number().int().positive(),
  requestTimeout: z.number().int().positive(),
});

export const VoltageConfigSchema = z.object({
  divider: z.number(),
  multiplier: z.number(),
  addition: z.number(),
});

export const UnitsConfigSchema = z.object({
  engine: z.object({
    ip: z.string().ip(),
  }),
  thermal: z.object({
    ip: z.string().ip(),
  }),
  requestDelay: z.number().int().positive(),
  warningThreshold: z.number().int().nonnegative(),
  errorThreshold: z.number().int().nonnegative(),
  voltage: VoltageConfigSchema,
});

export const CameraTypeSchema = z.enum(["dahua", "avtech", "vivotek", "hikvision"]);

export const CameraConfigSchema = z.object({
  ip: z.string().ip(),
  username: z.string(),
  password: z.string(),
  updateDelay: z.number().int().positive(),
  cameraType: CameraTypeSchema,
});

export const PcConfigSchema = z.object({
  os: z.enum(["windows", "ubuntu"]),
});

export const AppConfigSchema = z.object({
  password: z.string(),
  refreshRequestLimit: z.number().int().positive().optional(),
});

export const MainConfigSchema = z.object({
  babybox: BabyboxConfigSchema,
  backend: BackendConfigSchema,
  configer: ConfigerConfigSchema,
  startup: z.object({}).passthrough(), // Allow any fields
  units: UnitsConfigSchema,
  camera: CameraConfigSchema,
  pc: PcConfigSchema,
  app: AppConfigSchema,
});

// Infer types from schemas
export type MainConfig = z.infer<typeof MainConfigSchema>;
export type CameraType = z.infer<typeof CameraTypeSchema>;
export type VoltageConfig = z.infer<typeof VoltageConfigSchema>;
```

### 6.3 Unit Data Schemas

Create `source/apps/backend/src/schemas/units.schema.ts`:

```typescript
import { z } from "zod";

// Raw data from hardware (array of index-value pairs)
export const RawValueSchema = z.object({
  index: z.number().int().nonnegative(),
  value: z.string(),
});

export const RawUnitDataSchema = z.array(RawValueSchema);

// Parsed engine unit data
export const EngineUnitSchema = z.object({
  blockValue: z.number().int(),
  leftMotorLoad: z.number().int(),
  rightMotorLoad: z.number().int(),
  leftMotorCurrent: z.number().int(),
  rightMotorCurrent: z.number().int(),
  leftMotorPosition: z.number().int(),
  rightMotorPosition: z.number().int(),
  temperature: z.number(),
  outerDoorState: z.string(),
  innerDoorState: z.string(),
  barrierIn: z.boolean(),
  barrierOut: z.boolean(),
  inspectionTimer: z.number().int(),
  // ... add all fields
});

// Parsed thermal unit data
export const ThermalUnitSchema = z.object({
  innerTemperature: z.number(),
  outsideTemperature: z.number(),
  casingTemperature: z.number(),
  topTemperature: z.number(),
  bottomTemperature: z.number(),
  heatingActive: z.boolean(),
  coolingActive: z.boolean(),
  batteryVoltage: z.number(),
  inputVoltage: z.number(),
  gsmVoltage: z.number(),
  serviceDoorOpen: z.boolean(),
  // ... add all fields
});

export type EngineUnit = z.infer<typeof EngineUnitSchema>;
export type ThermalUnit = z.infer<typeof ThermalUnitSchema>;
export type RawUnitData = z.infer<typeof RawUnitDataSchema>;
```

### 6.4 API Request/Response Schemas

Create `source/apps/backend/src/schemas/api.schema.ts`:

```typescript
import { z } from "zod";
import { EngineUnitSchema, ThermalUnitSchema } from "./units.schema.js";

// Successful response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// Error response
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
});

// Settings request
export const SettingsUpdateSchema = z.object({
  engineIp: z.string().ip().optional(),
  thermalIp: z.string().ip().optional(),
  requestDelay: z.number().int().positive().optional(),
});

// Action request
export const ActionRequestSchema = z.object({
  action: z.enum([
    "openServiceDoor",
    "openOuterDoor", 
    "openInnerDoor",
    "openBothDoors",
    "openAll",
    "heatingOn",
    "heatingOff",
    "coolingOn",
    "coolingOff",
    // ... all actions
  ]),
});

export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;
export type ActionRequest = z.infer<typeof ActionRequestSchema>;
```

### 6.5 Validation Middleware

Create `source/apps/backend/src/middleware/validate.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}
```

### 6.6 Apply Validation to Routes

Update `source/apps/backend/src/routes/unitsRoute.ts`:

```typescript
import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { SettingsUpdateSchema, ActionRequestSchema } from "../schemas/api.schema.js";

const router = Router();

// Validate settings updates
router.put(
  "/settings",
  validate(SettingsUpdateSchema),
  async (req, res) => {
    // req.body is now typed and validated
    const settings = req.body;
    // ...
  }
);

// Validate action param
router.get("/actions/:action", async (req, res) => {
  const result = ActionRequestSchema.shape.action.safeParse(req.params.action);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: `Invalid action: ${req.params.action}`,
    });
  }
  // ...
});
```

### 6.7 Config Validation in Configer

Update `source/apps/configer/src/routes/configRoute.ts`:

```typescript
import { MainConfigSchema } from "../schemas/config.schema.js";

router.put("/main", async (req, res) => {
  const result = MainConfigSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid configuration",
      details: result.error.errors,
    });
  }

  // result.data is fully typed MainConfig
  const config = result.data;
  await db.update(config);
  
  res.json({ success: true, data: config });
});
```

### 6.8 Replace Manual Type Guards

**Before** (configer `src/types/main.types.ts`):
```typescript
export function isInstanceOfMainConfig(obj: any): obj is MainConfig {
  return (
    "babybox" in obj &&
    "backend" in obj &&
    "configer" in obj &&
    // ... 30+ more checks
  );
}
```

**After**:
```typescript
import { MainConfigSchema } from "../schemas/config.schema.js";

export function isInstanceOfMainConfig(obj: unknown): obj is MainConfig {
  return MainConfigSchema.safeParse(obj).success;
}

// Or just use Zod directly:
const result = MainConfigSchema.safeParse(obj);
if (result.success) {
  // result.data is MainConfig
}
```

### 6.9 Panel Validation (Optional)

For frontend, Zod can validate API responses:

```typescript
// api/units.ts
import { EngineUnitSchema } from "../schemas/units.schema";

export async function getEngineData(): Promise<EngineUnit | null> {
  const response = await fetch("/api/v1/engine/data");
  const json = await response.json();
  
  const result = EngineUnitSchema.safeParse(json.data);
  if (!result.success) {
    console.error("Invalid engine data:", result.error);
    return null;
  }
  
  return result.data;
}
```

## Files to Create

```
backend/src/schemas/
  config.schema.ts
  units.schema.ts
  api.schema.ts
backend/src/middleware/
  validate.ts

configer/src/schemas/
  config.schema.ts (can share with backend)

panel/src/schemas/
  units.schema.ts (for response validation)
```

## Files to Update

```
backend/src/routes/unitsRoute.ts - Add validation
backend/src/routes/engineRoute.ts - Add validation
backend/src/routes/thermalRoute.ts - Add validation
configer/src/routes/configRoute.ts - Add validation
configer/src/types/main.types.ts - Replace manual guards
```

## Benefits After Completion

1. **Runtime safety**: Invalid data caught at boundaries
2. **Better errors**: Clear messages about what's wrong
3. **Less code**: No more manual type guards
4. **Documentation**: Schemas document expected shapes
5. **Inference**: Types derived from schemas, single source of truth

## Verification

```bash
# Type check
cd source && pnpm -r typecheck

# Test validation
curl -X PUT http://localhost:5000/api/v1/units/settings \
  -H "Content-Type: application/json" \
  -d '{"invalidField": true}'
# Should return 400 with validation error

# Test valid request
curl -X PUT http://localhost:5000/api/v1/units/settings \
  -H "Content-Type: application/json" \
  -d '{"engineIp": "10.1.1.5"}'
# Should succeed
```

## Rollback

Zod is additive:
- Remove schema files
- Remove validation middleware
- Restore manual type guards from git history
- Remove zod from dependencies
