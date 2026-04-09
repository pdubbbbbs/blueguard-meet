import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { PeerState, ParticipantInfo, MediaState } from "@shared/types";
import { trpc } from "@/lib/trpc";

// Fallback STUN-only config if tRPC call fails
const FALLBACK_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(
  socket: Socket,
  roomId: string,
  displayName: string,
  isHost: boolean,
  localStream: MediaStream | null
) {
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceConfigRef = useRef<RTCConfiguration>(FALLBACK_ICE_CONFIG);

  // Fetch ICE servers from the backend (includes TURN if configured)
  const { data: iceData } = trpc.ice.getServers.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update ICE config when data arrives
  useEffect(() => {
    if (iceData?.iceServers) {
      iceConfigRef.current = { iceServers: iceData.iceServers };
    }
  }, [iceData]);

  const createPeerConnection = useCallback(
    (remoteSocketId: string, remoteInfo: ParticipantInfo) => {
      if (peerConnections.current.has(remoteSocketId)) {
        return peerConnections.current.get(remoteSocketId)!;
      }

      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnections.current.set(remoteSocketId, pc);

      // Add local tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            to: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setPeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(remoteSocketId);
            next.set(remoteSocketId, {
              ...(existing || {
                socketId: remoteSocketId,
                displayName: remoteInfo.displayName,
                isHost: remoteInfo.isHost,
                mediaState: { audio: true, video: true },
              }),
              stream: remoteStream,
            });
            return next;
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          // Will be cleaned up by participant-left event
        }
      };

      // Initialize peer state
      setPeers((prev) => {
        const next = new Map(prev);
        if (!next.has(remoteSocketId)) {
          next.set(remoteSocketId, {
            socketId: remoteSocketId,
            displayName: remoteInfo.displayName,
            isHost: remoteInfo.isHost,
            mediaState: { audio: true, video: true },
          });
        }
        return next;
      });

      return pc;
    },
    [localStream, socket]
  );

  const cleanupPeer = useCallback((socketId: string) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(socketId);
    }
    pendingCandidates.current.delete(socketId);
    setPeers((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket || !localStream) return;

    // When we get existing participants, create offers to each
    const handleRoomParticipants = async (participants: ParticipantInfo[]) => {
      for (const p of participants) {
        const pc = createPeerConnection(p.socketId, p);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { to: p.socketId, offer });
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      }
    };

    // When a new participant joins, wait for their offer
    const handleParticipantJoined = (info: ParticipantInfo) => {
      createPeerConnection(info.socketId, info);
    };

    // Handle incoming offer
    const handleOffer = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      const existingPeer = peers.get(data.from);
      const info: ParticipantInfo = existingPeer || {
        socketId: data.from,
        displayName: "Participant",
        isHost: false,
      };
      const pc = createPeerConnection(data.from, info);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        // Apply any pending candidates
        const pending = pendingCandidates.current.get(data.from) || [];
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(data.from);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { to: data.from, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    // Handle incoming answer
    const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          // Apply any pending candidates
          const pending = pendingCandidates.current.get(data.from) || [];
          for (const candidate of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.current.delete(data.from);
        } catch (err) {
          console.error("Error handling answer:", err);
        }
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.from);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      } else {
        // Queue candidate until remote description is set
        if (!pendingCandidates.current.has(data.from)) {
          pendingCandidates.current.set(data.from, []);
        }
        pendingCandidates.current.get(data.from)!.push(data.candidate);
      }
    };

    // Handle participant left
    const handleParticipantLeft = (data: { socketId: string }) => {
      cleanupPeer(data.socketId);
    };

    // Handle media state changes from remote peers
    const handleMediaStateChange = (data: { socketId: string; audio: boolean; video: boolean }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.socketId);
        if (existing) {
          next.set(data.socketId, {
            ...existing,
            mediaState: { audio: data.audio, video: data.video },
          });
        }
        return next;
      });
    };

    socket.on("room-participants", handleRoomParticipants);
    socket.on("participant-joined", handleParticipantJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("participant-left", handleParticipantLeft);
    socket.on("media-state-change", handleMediaStateChange);

    return () => {
      socket.off("room-participants", handleRoomParticipants);
      socket.off("participant-joined", handleParticipantJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("participant-left", handleParticipantLeft);
      socket.off("media-state-change", handleMediaStateChange);
    };
  }, [socket, localStream, createPeerConnection, cleanupPeer]);

  const cleanup = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    setPeers(new Map());
  }, []);

  return { peers, cleanup, turnConfigured: iceData?.turnConfigured ?? false };
}
