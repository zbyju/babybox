import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createConsoleLogger } from "./console";
import { createFileLogger } from "./file";
import { createCombinedLogger } from "./combined";

const TEST_LOG_DIR = "./test-logs";

describe("console logger", () => {
  it("logs at different levels", () => {
    const logger = createConsoleLogger("debug");

    // These should not throw
    logger.debug("startup", "Debug message");
    logger.info("startup", "Info message");
    logger.warn("startup", "Warning message", []);
    logger.error("startup", "Error message", []);
  });

  it("respects log level", () => {
    const logger = createConsoleLogger("error");

    // These should be filtered out (no console output)
    logger.debug("startup", "Debug");
    logger.info("startup", "Info");
    logger.warn("startup", "Warn", []);

    // Only this should output
    logger.error("startup", "Error", []);
  });
});

describe("file logger", () => {
  beforeEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  it("creates log files", async () => {
    const logger = createFileLogger({
      logDir: TEST_LOG_DIR,
      filePrefix: "test",
      level: "debug",
    });

    logger.info("startup", "Test message");
    await logger.flush();

    // Check that directory was created
    expect(existsSync(TEST_LOG_DIR)).toBe(true);
  });

  it("writes valid JSON", async () => {
    const logger = createFileLogger({
      logDir: TEST_LOG_DIR,
      filePrefix: "test",
      level: "debug",
    });

    logger.info("startup", "Test message");
    await logger.flush();

    const date = new Date();
    const fileName = `test.${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.log`;

    const content = await readFile(`${TEST_LOG_DIR}/${fileName}`, "utf-8");
    const entry = JSON.parse(content.trim()) as {
      level: string;
      module: string;
      message: string;
    };

    expect(entry.level).toBe("info");
    expect(entry.module).toBe("startup");
    expect(entry.message).toBe("Test message");
  });
});

describe("combined logger", () => {
  beforeEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_LOG_DIR)) {
      await rm(TEST_LOG_DIR, { recursive: true });
    }
  });

  it("writes to both console and file", async () => {
    const logger = createCombinedLogger({
      logDir: TEST_LOG_DIR,
      filePrefix: "combined",
      consoleLevel: "info",
      fileLevel: "debug",
    });

    logger.info("startup", "Combined test");
    await logger.flush();

    expect(existsSync(TEST_LOG_DIR)).toBe(true);
  });
});
