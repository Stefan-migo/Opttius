import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/upload/route";
import { isR2Configured, r2Client } from "@/lib/r2/client";
import { createClient } from "@/utils/supabase/server";

// Mock Supabase
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock R2 Client
vi.mock("@/lib/r2/client", () => ({
  r2Client: {
    send: vi.fn(),
  },
  r2Config: {
    bucketName: "test-bucket",
    publicUrl: "https://cdn.test.com",
  },
  isR2Configured: vi.fn(),
}));

// Mock Logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("POST /api/upload", () => {
  let mockSupabase: unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({
          data: { path: "test/path.png" },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://supabase.com/test.png" },
        }),
      },
    };

    (createClient as unknown).mockResolvedValue(mockSupabase);
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth error"),
    });

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if no file is provided", async () => {
    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No se proporcionó ningún archivo");
  });

  it("should return 413 if file is too large", async () => {
    const hugeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "huge.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.append("file", hugeFile);

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
      url: "http://localhost/api/upload",
    } as unknown;

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("should return 400 if file type is not allowed", async () => {
    const textFile = new File(["hello"], "hello.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", textFile);

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
      url: "http://localhost/api/upload",
    } as unknown;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Tipo de archivo no permitido");
  });

  it("should upload to R2 if configured", async () => {
    (isR2Configured as unknown).mockReturnValue(true);
    const validFile = new File(["dummy content"], "test.png", {
      type: "image/png",
    });

    // Mock arrayBuffer for Node environment in tests
    validFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(13));

    const formData = new FormData();
    formData.append("file", validFile);
    formData.append("folder", "avatars");

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
      url: "http://localhost/api/upload",
    } as unknown;

    const res = await POST(req);

    // If it still returns 500, log the error for debugging
    if (res.status === 500) {
      const error = await res.json();
      console.error("R2 Upload Error details:", error);
    }

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storage).toBe("r2");
    expect(data.url).toContain("https://cdn.test.com/avatars/");
    expect(r2Client?.send).toHaveBeenCalled();
  });

  it("should fallback to Supabase if R2 is not configured", async () => {
    (isR2Configured as unknown).mockReturnValue(false);
    const validFile = new File(["dummy content"], "test.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.append("file", validFile);

    const req = {
      formData: vi.fn().mockResolvedValue(formData),
      url: "http://localhost/api/upload",
    } as unknown;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storage).toBe("supabase");
    expect(data.url).toBe("https://supabase.com/test.png");
    expect(mockSupabase.storage.from).toHaveBeenCalled();
    expect(mockSupabase.storage.upload).toHaveBeenCalled();
  });
});
