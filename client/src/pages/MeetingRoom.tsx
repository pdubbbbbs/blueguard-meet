import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoTile } from "@/components/VideoTile";
import { ChatPanel } from "@/components/ChatPanel";
import { ControlsBar } from "@/components/ControlsBar";
import { MeetingSettings } from "@/components/MeetingSettings";
import { Shield, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@shared/types";

export default function MeetingRoom() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId || "";
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const displayName = searchParams.get("name") || "Guest";
  const isHost = searchParams.get("host") === "true";

  // Retrieve hostSecret from sessionStorage (never exposed in URL)
  const hostSecret = isHost ? sessionStorage.getItem(`hostSecret:${roomId}`) || "" : "";

  const { socket, connected } = useSocket();
  const {
    stream: localStream,
    audioEnabled,
    videoEnabled,
    initStream,
    toggleAudio,
    toggleVideo,
    stopStream,
  } = useMediaStream();

  const { peers, cleanup: cleanupPeers, turnConfigured } = useWebRTC(
    socket,
    roomId,
    displayName,
    isHost,
    localStream
  );

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const joinedRef = useRef(false);

  const { data: meeting } = trpc.meeting.getByRoomId.useQuery(
    { roomId },
    { enabled: !!roomId }
  );

  const endMeetingMutation = trpc.meeting.end.useMutation();

  // Initialize media and join room
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    if (joinedRef.current) return;
    const setup = async () => {
      await initStream();
      setMediaReady(true);
    };
    setup();
  }, [initStream]);

  // Join room when connected and media attempted (even if no stream)
  useEffect(() => {
    if (connected && mediaReady && !joinedRef.current) {
      joinedRef.current = true;
      socket.emit("join-room", { roomId, displayName, isHost, hostSecret });
    }
  }, [connected, mediaReady, socket, roomId, displayName, isHost, hostSecret]);

  // Chat messages
  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) {
        setUnreadMessages((prev) => prev + 1);
      }
    };

    socket.on("chat-message", handleChatMessage);
    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [socket, chatOpen]);

  // Meeting ended / removed / muted by host
  useEffect(() => {
    const handleMeetingEnded = () => setMeetingEnded(true);
    const handleRemoved = () => setRemoved(true);
    const handleRoomFull = () => navigate("/");
    const handleHostMuted = () => {
      // Host muted us — disable our audio track
      if (audioEnabled) {
        toggleAudio();
      }
    };

    socket.on("meeting-ended", handleMeetingEnded);
    socket.on("removed-from-meeting", handleRemoved);
    socket.on("room-full", handleRoomFull);
    socket.on("host-muted-you", handleHostMuted);

    return () => {
      socket.off("meeting-ended", handleMeetingEnded);
      socket.off("removed-from-meeting", handleRemoved);
      socket.off("room-full", handleRoomFull);
      socket.off("host-muted-you", handleHostMuted);
    };
  }, [socket, navigate, audioEnabled, toggleAudio]);

  // Notify media state changes
  useEffect(() => {
    if (connected) {
      socket.emit("media-state-change", {
        roomId,
        audio: audioEnabled,
        video: videoEnabled,
      });
    }
  }, [audioEnabled, videoEnabled, connected, socket, roomId]);

  const handleToggleChat = useCallback(() => {
    setChatOpen((prev) => {
      if (!prev) {
        setUnreadMessages(0);
        setSettingsOpen(false);
      }
      return !prev;
    });
  }, []);

  const handleToggleSettings = useCallback(() => {
    setSettingsOpen((prev) => {
      if (!prev) setChatOpen(false);
      return !prev;
    });
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      socket.emit("chat-message", { roomId, text, sender: displayName });
    },
    [socket, roomId, displayName]
  );

  const handleLeave = useCallback(() => {
    socket.emit("leave-room", { roomId });
    cleanupPeers();
    stopStream();
    navigate("/");
  }, [socket, roomId, cleanupPeers, stopStream, navigate]);

  const handleEndMeeting = useCallback(() => {
    socket.emit("end-meeting", { roomId });
    endMeetingMutation.mutate({ roomId, hostSecret });
    cleanupPeers();
    stopStream();
    navigate("/");
  }, [socket, roomId, hostSecret, endMeetingMutation, cleanupPeers, stopStream, navigate]);

  const handleRemoveParticipant = useCallback(
    (targetSocketId: string) => {
      socket.emit("remove-participant", { roomId, targetSocketId });
    },
    [socket, roomId]
  );

  // Meeting ended overlay
  if (meetingEnded || removed) {
    return (
      <div className="min-h-screen bg-[#060b18] bg-grid flex items-center justify-center p-4">
        <div className="glow-border rounded-2xl bg-[#0a1128] p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {removed ? "You were removed" : "Meeting Ended"}
          </h2>
          <p className="text-slate-400 mb-6">
            {removed
              ? "The host has removed you from this meeting."
              : "The host has ended this meeting for all participants."}
          </p>
          <Button
            onClick={() => navigate("/")}
            className="glow-button text-white border-0 rounded-xl"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Build participant list for grid
  const participantList = [
    {
      id: "local",
      displayName,
      isHost,
      stream: localStream || undefined,
      audioEnabled,
      videoEnabled,
      isLocal: true,
    },
    ...Array.from(peers.values()).map((p) => ({
      id: p.socketId,
      displayName: p.displayName,
      isHost: p.isHost,
      stream: p.stream,
      audioEnabled: p.mediaState.audio,
      videoEnabled: p.mediaState.video,
      isLocal: false,
    })),
  ];

  const totalParticipants = participantList.length;

  // Grid layout based on participant count
  const getGridCols = () => {
    if (totalParticipants <= 1) return "grid-cols-1";
    if (totalParticipants <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-2 lg:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="h-screen flex flex-col bg-[#060b18]">
      {/* Header */}
      <header className="bg-[#0a1128]/80 backdrop-blur-sm border-b border-blue-500/10 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-none">
                {meeting?.title || "Meeting"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {turnConfigured && (
              <div className="hidden sm:flex items-center gap-1 text-blue-400" title="TURN relay active">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>TURN</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span>{connected ? "Connected" : "Connecting..."}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          <div className={`grid ${getGridCols()} gap-2 sm:gap-3 h-full auto-rows-fr`}>
            {participantList.map((p) => (
              <VideoTile
                key={p.id}
                stream={p.stream}
                displayName={p.displayName}
                isHost={p.isHost}
                audioEnabled={p.audioEnabled}
                videoEnabled={p.videoEnabled}
                isLocal={p.isLocal}
                showRemove={isHost}
                onRemove={
                  !p.isLocal ? () => handleRemoveParticipant(p.id) : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-80 shrink-0 hidden sm:block">
            <ChatPanel
              messages={messages}
              onSend={handleSendMessage}
              onClose={handleToggleChat}
              currentUser={displayName}
            />
          </div>
        )}

        {/* Settings panel */}
        {settingsOpen && (
          <div className="w-80 shrink-0 hidden sm:block">
            <MeetingSettings
              isOpen={settingsOpen}
              onClose={handleToggleSettings}
              isHost={isHost}
              roomId={roomId}
              meetingTitle={meeting?.title || "Meeting"}
              participants={participantList}
              onRemoveParticipant={isHost ? handleRemoveParticipant : undefined}
              onEndMeeting={isHost ? handleEndMeeting : undefined}
              socket={socket}
            />
          </div>
        )}
      </div>

      {/* Mobile chat overlay */}
      {chatOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-[#060b18]/95">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            onClose={handleToggleChat}
            currentUser={displayName}
          />
        </div>
      )}

      {/* Controls */}
      <ControlsBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeave={handleLeave}
        onToggleChat={handleToggleChat}
        chatOpen={chatOpen}
        isHost={isHost}
        onEndMeeting={isHost ? handleEndMeeting : undefined}
        participantCount={totalParticipants}
        roomId={roomId}
        unreadMessages={unreadMessages}
        onToggleSettings={handleToggleSettings}
        settingsOpen={settingsOpen}
      />
    </div>
  );
}
