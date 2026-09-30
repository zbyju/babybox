import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { tcpPort } from "./tcpPort.js";

describe("tcpPort", () => {
  it("returns the port of a listening TCP server", async () => {
    const server = http.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      expect(tcpPort(server)).toBeGreaterThan(0);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it("throws when the server is not listening", () => {
    const server = http.createServer();
    expect(() => tcpPort(server)).toThrow(
      "The test server is not listening on a TCP port."
    );
  });

  it("throws when the server listens on a pipe", async () => {
    const server = http.createServer();
    const socketPath = path.join(os.tmpdir(), `bb-port-${process.pid}.sock`);
    fs.rmSync(socketPath, { force: true });
    await new Promise<void>((resolve) => {
      server.listen(socketPath, resolve);
    });
    try {
      expect(() => tcpPort(server)).toThrow(
        "The test server is not listening on a TCP port."
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      fs.rmSync(socketPath, { force: true });
    }
  });
});
