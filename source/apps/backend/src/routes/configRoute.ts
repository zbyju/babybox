import { Router, Request, Response } from "express";
import { DbFactory } from "../services/config/factory";
import { MainConfigSchema } from "../schemas/config.schema";

const router = Router();

// GET /api/v1/config/main
router.get("/main", async (_req: Request, res: Response) => {
  try {
    const db = await DbFactory.getMainDb();
    res.json(db.data());
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load config" });
  }
});

// PUT /api/v1/config/main
router.put("/main", async (req: Request, res: Response) => {
  const result = MainConfigSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: "Invalid configuration",
      details: result.error.issues,
    });
    return;
  }

  try {
    const db = await DbFactory.getMainDb();
    const updated = await db.update(result.data);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update config" });
  }
});

// GET /api/v1/config/version (and alias /versions)
router.get(["/version", "/versions"], async (_req: Request, res: Response) => {
  try {
    const db = await DbFactory.getVersionDb();
    res.json(db.data());
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load versions" });
  }
});

export { router as configRoute };
