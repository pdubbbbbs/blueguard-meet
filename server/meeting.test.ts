import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  createMeeting: vi.fn(),
  getMeetingByRoomId: vi.fn(),
  endMeeting: vi.fn(),
}));

import { createMeeting, getMeetingByRoomId, endMeeting } from "./db";

const mockedCreateMeeting = vi.mocked(createMeeting);
const mockedGetMeetingByRoomId = vi.mocked(getMeetingByRoomId);
const mockedEndMeeting = vi.mocked(endMeeting);

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

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("meeting.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a meeting with valid input", async () => {
    const mockMeeting = {
      id: 1,
      roomId: "abc123def456",
      title: "Team Standup",
      hostName: "John",
      hostUserId: null,
      isActive: true,
      maxParticipants: 10,
      createdAt: new Date(),
      endedAt: null,
    };
    mockedCreateMeeting.mockResolvedValue(mockMeeting);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meeting.create({
      title: "Team Standup",
      hostName: "John",
    });

    expect(result).toBeDefined();
    expect(result?.title).toBe("Team Standup");
    expect(result?.hostName).toBe("John");
    expect(result?.isActive).toBe(true);
    expect(result?.maxParticipants).toBe(10);
    expect(mockedCreateMeeting).toHaveBeenCalledOnce();
  });

  it("creates a meeting with authenticated user", async () => {
    const mockMeeting = {
      id: 2,
      roomId: "xyz789abc012",
      title: "Design Review",
      hostName: "Jane",
      hostUserId: 1,
      isActive: true,
      maxParticipants: 10,
      createdAt: new Date(),
      endedAt: null,
    };
    mockedCreateMeeting.mockResolvedValue(mockMeeting);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meeting.create({
      title: "Design Review",
      hostName: "Jane",
    });

    expect(result).toBeDefined();
    expect(result?.hostUserId).toBe(1);
  });

  it("rejects empty title", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.meeting.create({ title: "", hostName: "John" })
    ).rejects.toThrow();
  });

  it("rejects empty hostName", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.meeting.create({ title: "Test", hostName: "" })
    ).rejects.toThrow();
  });
});

describe("meeting.getByRoomId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns meeting when found", async () => {
    const mockMeeting = {
      id: 1,
      roomId: "abc123",
      title: "Team Standup",
      hostName: "John",
      hostUserId: null,
      isActive: true,
      maxParticipants: 10,
      createdAt: new Date(),
      endedAt: null,
    };
    mockedGetMeetingByRoomId.mockResolvedValue(mockMeeting);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meeting.getByRoomId({ roomId: "abc123" });

    expect(result).toBeDefined();
    expect(result?.roomId).toBe("abc123");
    expect(result?.title).toBe("Team Standup");
  });

  it("returns null when meeting not found", async () => {
    mockedGetMeetingByRoomId.mockResolvedValue(null);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meeting.getByRoomId({ roomId: "nonexistent" });

    expect(result).toBeNull();
  });
});

describe("meeting.end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ends a meeting successfully", async () => {
    mockedEndMeeting.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meeting.end({ roomId: "abc123" });

    expect(result).toEqual({ success: true });
    expect(mockedEndMeeting).toHaveBeenCalledWith("abc123");
  });
});
