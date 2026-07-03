/**
 * Unit tests for email client (client.ts)
 *
 * Tests sendEmail and sendBatchEmails with a mocked Resend SDK.
 * Module-level resend is initialized via hoisted env var.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockResendCtor, mockEmailsSend } = vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM_EMAIL = "noreply@opttius.cl";
  process.env.NEXT_PUBLIC_APP_URL = "https://opttius.cl";

    const send = vi.fn();
  return {
    // Regular function so it works with `new Resend()`
    mockResendCtor: vi.fn(function () {
      return { emails: { send } };
    }),
    mockEmailsSend: send,
  };
});

vi.mock("resend", () => ({ Resend: mockResendCtor }));

vi.mock("@/lib/logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { emailConfig, sendBatchEmails, sendEmail } from "@/lib/email/client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendEmail", () => {
  it("sends successfully and returns the email id", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "email_123" }, error: null });

    const result = await sendEmail({
      to: "user@test.com",
      subject: "Welcome",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ success: true, id: "email_123" });
    expect(mockEmailsSend).toHaveBeenCalledWith({
      from: "noreply@opttius.cl",
      to: "user@test.com",
      subject: "Welcome",
      html: "<p>Hello</p>",
      reply_to: "contacto@opttius.cl",
    });
  });

  it("passes optional text and replyTo", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "e1" }, error: null });

    await sendEmail({
      to: "user@test.com",
      subject: "T",
      html: "<p>Hi</p>",
      text: "Hi",
      replyTo: "support@opttius.cl",
    });

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Hi", reply_to: "support@opttius.cl" }),
    );
  });

  it("formats fromDisplayName as 'Name <email>'", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "e1" }, error: null });

    await sendEmail({
      to: "user@test.com",
      subject: "T",
      html: "<p>Hi</p>",
      fromDisplayName: "Óptica Los Andes",
    });

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Óptica Los Andes <noreply@opttius.cl>" }),
    );
  });

  it("skips fromDisplayName when empty", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "e1" }, error: null });

    await sendEmail({
      to: "user@test.com",
      subject: "T",
      html: "<p>Hi</p>",
      fromDisplayName: "",
    });

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@opttius.cl" }),
    );
  });

  it("handles API failure and returns error message", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const result = await sendEmail({
      to: "user@test.com",
      subject: "Oops",
      html: "<p>Borked</p>",
    });

    expect(result).toEqual({ success: false, error: "Rate limit exceeded" });
  });

  it("handles non-Error rejection as Unknown error", async () => {
    mockEmailsSend.mockRejectedValueOnce("string oops");

    const result = await sendEmail({
      to: "user@test.com",
      subject: "T",
      html: "<p>Hi</p>",
    });

    expect(result).toEqual({ success: false, error: "Unknown error" });
  });
});

describe("sendBatchEmails", () => {
  it("sends multiple emails and returns per-email results", async () => {
    mockEmailsSend
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "e2" }, error: null });

    const results = await sendBatchEmails([
      { to: "a@test.com", subject: "A", html: "<p>A</p>" },
      { to: "b@test.com", subject: "B", html: "<p>B</p>" },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ email: "a@test.com", success: true, id: "e1" });
    expect(results[1]).toEqual({ email: "b@test.com", success: true, id: "e2" });
  });

  it("handles partial failures", async () => {
    mockEmailsSend
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null })
      .mockRejectedValueOnce(new Error("Failed"));

    const results = await sendBatchEmails([
      { to: "a@test.com", subject: "A", html: "<p>A</p>" },
      { to: "b@test.com", subject: "B", html: "<p>B</p>" },
    ]);

    expect(results[0].success).toBe(true);
    expect(results[1]).toEqual({ email: "b@test.com", success: false, error: "Failed" });
  });

  it("sends a single email without delay", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "e1" }, error: null });

    const results = await sendBatchEmails([
      { to: "a@test.com", subject: "A", html: "<p>A</p>" },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });
});

describe("emailConfig", () => {
  it("has expected defaults from env", () => {
    expect(emailConfig.from).toBe("noreply@opttius.cl");
    expect(emailConfig.replyTo).toBe("contacto@opttius.cl");
    expect(emailConfig.domain).toBe("https://opttius.cl");
  });
});
