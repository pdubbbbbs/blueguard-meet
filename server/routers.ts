import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import { createMeeting, getMeetingByRoomId, endMeeting, verifyHostSecret } from "./db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  ice: router({
    getServers: publicProcedure.query(() => {
      const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
        // Free Google STUN servers (always included)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ];

      // Add configured TURN server if available
      if (ENV.turnServerUrl) {
        const turnUrls = ENV.turnServerUrl.split(",").map(u => u.trim()).filter(Boolean);
        servers.push({
          urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
          username: ENV.turnServerUsername || undefined,
          credential: ENV.turnServerCredential || undefined,
        });
      }

      return { iceServers: servers, turnConfigured: !!ENV.turnServerUrl };
    }),
  }),

  meeting: router({
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        hostName: z.string().min(1).max(255),
      }))
      .mutation(async ({ input, ctx }) => {
        // Rate limit: 10 meetings per IP per minute
        const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
        if (!checkRateLimit(`create:${ip}`, 10, 60_000)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many meetings created. Try again later." });
        }

        const roomId = nanoid(12);
        const hostSecret = nanoid(32);
        const meeting = await createMeeting({
          roomId,
          title: input.title,
          hostName: input.hostName,
          hostUserId: ctx.user.id,
          hostSecret,
          isActive: true,
          maxParticipants: 10,
        });
        // Return hostSecret only to the admin creator
        return meeting;
      }),

    getByRoomId: publicProcedure
      .input(z.object({ roomId: z.string() }))
      .query(async ({ input }) => {
        const meeting = await getMeetingByRoomId(input.roomId);
        if (!meeting) return null;
        // Strip hostSecret from public queries
        const { hostSecret: _, ...safeMeeting } = meeting;
        return safeMeeting;
      }),

    end: adminProcedure
      .input(z.object({
        roomId: z.string(),
        hostSecret: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const valid = await verifyHostSecret(input.roomId, input.hostSecret);
        if (!valid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Invalid host credentials." });
        }
        await endMeeting(input.roomId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
