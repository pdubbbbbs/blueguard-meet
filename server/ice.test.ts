import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("ice.getServers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env.TURN_SERVER_URL = originalEnv.TURN_SERVER_URL;
    process.env.TURN_SERVER_USERNAME = originalEnv.TURN_SERVER_USERNAME;
    process.env.TURN_SERVER_CREDENTIAL = originalEnv.TURN_SERVER_CREDENTIAL;
  });

  it("always includes Google STUN servers", async () => {
    // Clear TURN env vars to test STUN-only mode
    process.env.TURN_SERVER_URL = "";
    process.env.TURN_SERVER_USERNAME = "";
    process.env.TURN_SERVER_CREDENTIAL = "";

    // Need to re-import to pick up env changes since ENV is cached
    // Instead, we test the endpoint behavior
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ice.getServers();

    expect(result).toBeDefined();
    expect(result.iceServers).toBeDefined();
    expect(Array.isArray(result.iceServers)).toBe(true);

    // Should have at least the STUN servers
    const stunServers = result.iceServers.filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => u.startsWith("stun:"));
    });
    expect(stunServers.length).toBeGreaterThanOrEqual(2);

    // Verify Google STUN servers are present
    const allUrls = result.iceServers.flatMap((s) =>
      Array.isArray(s.urls) ? s.urls : [s.urls]
    );
    expect(allUrls).toContain("stun:stun.l.google.com:19302");
    expect(allUrls).toContain("stun:stun1.l.google.com:19302");
  });

  it("returns turnConfigured status", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ice.getServers();

    expect(typeof result.turnConfigured).toBe("boolean");
  });

  it("returns iceServers as an array of objects with urls property", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ice.getServers();

    for (const server of result.iceServers) {
      expect(server).toHaveProperty("urls");
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      for (const url of urls) {
        expect(typeof url).toBe("string");
        expect(url.length).toBeGreaterThan(0);
      }
    }
  });

  it("STUN servers do not have credentials", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ice.getServers();

    const stunServers = result.iceServers.filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.every((u) => u.startsWith("stun:"));
    });

    for (const server of stunServers) {
      expect(server.username).toBeUndefined();
      expect(server.credential).toBeUndefined();
    }
  });

  it("is accessible as a public procedure (no auth required)", async () => {
    const ctx = createPublicContext();
    expect(ctx.user).toBeNull();

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ice.getServers();

    // Should not throw, proving it's a public endpoint
    expect(result).toBeDefined();
    expect(result.iceServers.length).toBeGreaterThan(0);
  });
});
