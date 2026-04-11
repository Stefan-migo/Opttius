import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/api/errors";
import { isRootUser, requireRoot } from "@/lib/api/root-middleware";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

// Mock dependencies
vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/service-role");
vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("requireRoot", () => {
  const mockRequest = {
    url: "http://localhost:3000/api/test",
    headers: new Headers(),
  } as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow root user", async () => {
    const mockUser = {
      id: "root-user-id",
      email: "root@opttius.com",
    };

    const mockAdminUser = {
      role: "root",
    };

    // Mock createClient
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown);

    // Mock createServiceRoleClient
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAdminUser,
              error: null,
            }),
          }),
        }),
      }),
    } as unknown);

    const result = await requireRoot(mockRequest);

    expect(result.userId).toBe(mockUser.id);
    expect(result.user.email).toBe(mockUser.email);
  });

  it("should allow dev user", async () => {
    const mockUser = {
      id: "dev-user-id",
      email: "dev@opttius.com",
    };

    const mockAdminUser = {
      role: "dev",
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown);

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAdminUser,
              error: null,
            }),
          }),
        }),
      }),
    } as unknown);

    const result = await requireRoot(mockRequest);

    expect(result.userId).toBe(mockUser.id);
  });

  it("should throw AuthorizationError for non-root user", async () => {
    const mockUser = {
      id: "admin-user-id",
      email: "admin@organization.com",
    };

    const mockAdminUser = {
      role: "admin",
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown);

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAdminUser,
              error: null,
            }),
          }),
        }),
      }),
    } as unknown);

    await expect(requireRoot(mockRequest)).rejects.toThrow(AuthorizationError);
    await expect(requireRoot(mockRequest)).rejects.toThrow(
      "Root access required",
    );
  });

  it("should throw AuthorizationError for unauthenticated user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Not authenticated"),
        }),
      },
    } as unknown);

    await expect(requireRoot(mockRequest)).rejects.toThrow(AuthorizationError);
    await expect(requireRoot(mockRequest)).rejects.toThrow("Unauthorized");
  });

  it("should throw AuthorizationError when admin user not found", async () => {
    const mockUser = {
      id: "user-id",
      email: "user@example.com",
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown);

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Not found"),
            }),
          }),
        }),
      }),
    } as unknown);

    await expect(requireRoot(mockRequest)).rejects.toThrow(AuthorizationError);
  });
});

describe("isRootUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for root user", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "root" },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown);

    const result = await isRootUser("root-user-id");
    expect(result).toBe(true);
  });

  it("should return true for dev user", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "dev" },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown);

    const result = await isRootUser("dev-user-id");
    expect(result).toBe(true);
  });

  it("should return false for admin user", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown);

    const result = await isRootUser("admin-user-id");
    expect(result).toBe(false);
  });

  it("should return false when user not found", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Not found"),
            }),
          }),
        }),
      }),
    } as unknown);

    const result = await isRootUser("non-existent-id");
    expect(result).toBe(false);
  });

  it("should return false on error", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      }),
    } as unknown);

    const result = await isRootUser("user-id");
    expect(result).toBe(false);
  });
});
