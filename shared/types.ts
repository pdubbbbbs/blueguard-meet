/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ===== Socket.IO / WebRTC Types =====

export interface ParticipantInfo {
  socketId: string;
  displayName: string;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface MediaState {
  audio: boolean;
  video: boolean;
}

export interface PeerState extends ParticipantInfo {
  stream?: MediaStream;
  mediaState: MediaState;
}
