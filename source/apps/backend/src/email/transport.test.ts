import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultEmailSettings } from "./settings.js";
import { classifyFailure, submit } from "./transport.js";

describe("outbound SMTP boundary", () => {
  const settings = {
    ...defaultEmailSettings,
    host: "smtp.example.com",
    user: "user",
    password: "private",
  };
  const nodemailer = { createTransport: vi.fn() };
  const sendMail = vi.fn();
  const close = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    sendMail.mockResolvedValue({ response: "250 accepted" });
    nodemailer.createTransport.mockReturnValue({ sendMail, close });
  });

  it("uses implicit TLS on 465 with certificate verification and bounded connection timeouts", async () => {
    const raw = Buffer.from("Subject: Alarm\r\n\r\nBody");
    expect(
      await submit(
        settings,
        "unit@example.com",
        "to@example.com",
        raw,
        nodemailer.createTransport
      )
    ).toBe("250 accepted");
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true,
        tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false,
      })
    );
    expect(sendMail).toHaveBeenCalledWith({
      envelope: { from: "unit@example.com", to: ["to@example.com"] },
      raw,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("never falls back to plaintext or retries within the transport on failure", async () => {
    const failure = Object.assign(new Error("self-signed certificate"), {
      code: "ESOCKET",
      originalCode: "DEPTH_ZERO_SELF_SIGNED_CERT",
    });
    sendMail.mockRejectedValue(failure);
    await expect(
      submit(
        settings,
        "unit@example.com",
        "to@example.com",
        Buffer.from("x"),
        nodemailer.createTransport
      )
    ).rejects.toBe(failure);
    expect(classifyFailure(failure)).toBe("configuration");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does not create a connection when credentials or addresses are invalid", async () => {
    await expect(
      submit(
        { ...settings, password: "" },
        "unit@example.com",
        "to@example.com",
        Buffer.from("x")
      )
    ).rejects.toThrow();
    await expect(
      submit(
        settings,
        "unit@example.com\r\nBAD",
        "to@example.com",
        Buffer.from("x")
      )
    ).rejects.toThrow();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});
