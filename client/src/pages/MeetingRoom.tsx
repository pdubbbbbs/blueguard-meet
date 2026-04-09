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
import { Shield, AlertCircle, ShieldCheck, Maximize, Minimize, Hand } from "lucide-react";
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
    socket, roomId, displayName, isHost, localStream
  );

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "speaker">("grid");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; from: string }>>([]);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const joinedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: meeting } = trpc.meeting.getByRoomId.useQuery(
    { roomId }, { enabled: !!roomId }
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
      if (!chatOpen) setUnreadMessages((prev) => prev + 1);
    };
    socket.on("chat-message", handleChatMessage);
    return () => { socket.off("chat-message", handleChatMessage); };
  }, [socket, chatOpen]);

  // Meeting events
  useEffect(() => {
    const handleMeetingEnded = () => setMeetingEnded(true);
    const handleRemoved = () => setRemoved(true);
    const handleRoomFull = () => navigate("/");
    const handleHostMuted = () => { if (audioEnabled) toggleAudio(); };

    // Hand raise from other participants
    const handleHandRaise = (data: { socketId: string; raised: boolean }) => {
      setRaisedHands(prev => {
        const next = new Set(prev);
        if (data.raised) next.add(data.socketId);
        else next.delete(data.socketId);
        return next;
      });
    };

    // Reactions from other participants
    const handleReaction = (data: { socketId: string; emoji: string; from: string }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setReactions(prev => [...prev, { id, emoji: data.emoji, from: data.from }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    };

    socket.on("meeting-ended", handleMeetingEnded);
    socket.on("removed-from-meeting", handleRemoved);
    socket.on("room-full", handleRoomFull);
    socket.on("host-muted-you", handleHostMuted);
    socket.on("hand-raise", handleHandRaise);
    socket.on("reaction", handleReaction);

    return () => {
      socket.off("meeting-ended", handleMeetingEnded);
      socket.off("removed-from-meeting", handleRemoved);
      socket.off("room-full", handleRoomFull);
      socket.off("host-muted-you", handleHostMuted);
      socket.off("hand-raise", handleHandRaise);
      socket.off("reaction", handleReaction);
    };
  }, [socket, navigate, audioEnabled, toggleAudio]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case " ": // Space = toggle mute
          e.preventDefault();
          toggleAudio();
          break;
        case "v": // V = toggle video
          if (!e.metaKey && !e.ctrlKey) toggleVideo();
          break;
        case "c": // C = toggle chat
          if (!e.metaKey && !e.ctrlKey) handleToggleChat();
          break;
        case "f": // F = fullscreen
          if (!e.metaKey && !e.ctrlKey) toggleFullscreen();
          break;
        case "h": // H = raise hand
          if (!e.metaKey && !e.ctrlKey) handleToggleHand();
          break;
        case "escape":
          if (isFullscreen) toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleAudio, toggleVideo, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // Notify media state changes
  useEffect(() => {
    if (connected) {
      socket.emit("media-state-change", { roomId, audio: audioEnabled, video: videoEnabled });
    }
  }, [audioEnabled, videoEnabled, connected, socket, roomId]);

  // BroadcastChannel — sync participant list to pop-out gallery window
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const channel = new BroadcastChannel(`blueguard-meet-${roomId}`);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data.type === "request-state") {
        // Gallery window requesting initial state — will be sent in the update below
      }
    };

    return () => channel.close();
  }, [roomId]);

  // Push updates to gallery window whenever participants change
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "participants-update",
        data: {
          title: meeting?.title || "Meeting",
          participants: participantList.map(p => ({
            id: p.id,
            displayName: p.displayName,
            isHost: p.isHost,
            audioEnabled: p.audioEnabled,
            videoEnabled: p.videoEnabled,
            isLocal: p.isLocal,
            // Note: MediaStream can't be sent via BroadcastChannel
            // Gallery popout shows avatars only (no video streams)
          })),
        },
      });
    }
  });

  // Screen sharing
  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing && screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(stream);
      setIsScreenSharing(true);
      // Auto-stop when user clicks browser's "Stop sharing"
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setIsScreenSharing(false);
      };
    } catch {
      // User cancelled
    }
  }, [isScreenSharing, screenStream]);

  const handleToggleChat = useCallback(() => {
    setChatOpen((prev) => {
      if (!prev) { setUnreadMessages(0); setSettingsOpen(false); }
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
    (text: string) => { socket.emit("chat-message", { roomId, text, sender: displayName }); },
    [socket, roomId, displayName]
  );

  const handleLeave = useCallback(() => {
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    socket.emit("leave-room", { roomId });
    cleanupPeers();
    stopStream();
    navigate("/");
  }, [socket, roomId, screenStream, cleanupPeers, stopStream, navigate]);

  const handleEndMeeting = useCallback(() => {
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    socket.emit("end-meeting", { roomId });
    endMeetingMutation.mutate({ roomId, hostSecret });
    cleanupPeers();
    stopStream();
    navigate("/");
  }, [socket, roomId, hostSecret, screenStream, endMeetingMutation, cleanupPeers, stopStream, navigate]);

  const handleRemoveParticipant = useCallback(
    (targetSocketId: string) => { socket.emit("remove-participant", { roomId, targetSocketId }); },
    [socket, roomId]
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  const handleToggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    socket.emit("hand-raise", { roomId, raised: next });
  }, [handRaised, socket, roomId]);

  const handleReaction = useCallback((emoji: string) => {
    socket.emit("reaction", { roomId, emoji, from: displayName });
    // Show locally too
    const id = `${Date.now()}-${Math.random()}`;
    setReactions(prev => [...prev, { id, emoji, from: displayName }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
  }, [socket, roomId, displayName]);

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
            {removed ? "The host has removed you from this meeting." : "The host has ended this meeting for all participants."}
          </p>
          <Button onClick={() => navigate("/")} className="glow-button text-white border-0 rounded-xl">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Build participant list
  const participantList = [
    {
      id: "local", displayName, isHost,
      stream: isScreenSharing ? screenStream || localStream || undefined : localStream || undefined,
      audioEnabled, videoEnabled: isScreenSharing ? true : videoEnabled,
      isLocal: true,
    },
    ...Array.from(peers.values()).map((p) => ({
      id: p.socketId, displayName: p.displayName, isHost: p.isHost,
      stream: p.stream, audioEnabled: p.mediaState.audio,
      videoEnabled: p.mediaState.video, isLocal: false,
    })),
  ];

  const totalParticipants = participantList.length;
  const pinned = pinnedId ? participantList.find(p => p.id === pinnedId) : null;
  const unpinned = pinnedId ? participantList.filter(p => p.id !== pinnedId) : participantList;

  // Grid layout
  const getGridCols = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  };

  const useSpeakerLayout = layout === "speaker" || !!pinnedId;

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-[#060b18]">
      {/* Floating reactions */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {reactions.map(r => (
          <div key={r.id} className="animate-bounce text-center">
            <span className="text-3xl">{r.emoji}</span>
            <div className="text-[10px] text-slate-400">{r.from}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-[#0a1128]/80 backdrop-blur-sm border-b border-blue-500/10 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-none">
              {meeting?.title || "Meeting"}
            </h1>
            {isScreenSharing && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                Sharing Screen
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {/* Layout toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-[#162044] rounded-lg p-0.5">
              <button
                onClick={() => { setLayout("grid"); setPinnedId(null); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  layout === "grid" && !pinnedId ? "bg-blue-500/20 text-blue-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setLayout("speaker")}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  layout === "speaker" || pinnedId ? "bg-blue-500/20 text-blue-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Speaker
              </button>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center gap-1 text-slate-500 hover:text-blue-400 transition-colors"
              title="Toggle fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {turnConfigured && (
              <div className="hidden sm:flex items-center gap-1 text-blue-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>TURN</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
              <span>{connected ? "Connected" : "Connecting..."}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          {useSpeakerLayout ? (
            /* Speaker/Pinned layout */
            <div className="flex flex-col h-full gap-2">
              {/* Main speaker */}
              <div className="flex-1 min-h-0">
                {(pinned || participantList[0]) && (
                  <VideoTile
                    key={(pinned || participantList[0]).id}
                    stream={(pinned || participantList[0]).stream}
                    displayName={(pinned || participantList[0]).displayName}
                    isHost={(pinned || participantList[0]).isHost}
                    audioEnabled={(pinned || participantList[0]).audioEnabled}
                    videoEnabled={(pinned || participantList[0]).videoEnabled}
                    isLocal={(pinned || participantList[0]).isLocal}
                    showRemove={isHost}
                    onRemove={!(pinned || participantList[0]).isLocal ? () => handleRemoveParticipant((pinned || participantList[0]).id) : undefined}
                    handRaised={raisedHands.has((pinned || participantList[0]).id) || ((pinned || participantList[0]).isLocal && handRaised)}
                    onPin={() => setPinnedId(null)}
                    isPinned={!!pinnedId}
                  />
                )}
              </div>
              {/* Filmstrip of others */}
              {unpinned.length > (pinnedId ? 0 : 1) && (
                <div className="flex gap-2 overflow-x-auto py-1 shrink-0" style={{ height: "120px" }}>
                  {(pinnedId ? unpinned : unpinned.slice(1)).map(p => (
                    <div key={p.id} className="w-40 shrink-0 cursor-pointer" onClick={() => setPinnedId(p.id)}>
                      <VideoTile
                        stream={p.stream}
                        displayName={p.displayName}
                        isHost={p.isHost}
                        audioEnabled={p.audioEnabled}
                        videoEnabled={p.videoEnabled}
                        isLocal={p.isLocal}
                        handRaised={raisedHands.has(p.id) || (p.isLocal && handRaised)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Grid layout */
            <div className={`grid ${getGridCols(totalParticipants)} gap-2 sm:gap-3 h-full auto-rows-fr`}>
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
                  onRemove={!p.isLocal ? () => handleRemoveParticipant(p.id) : undefined}
                  handRaised={raisedHands.has(p.id) || (p.isLocal && handRaised)}
                  onPin={() => setPinnedId(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-80 shrink-0 hidden sm:block">
            <ChatPanel messages={messages} onSend={handleSendMessage} onClose={handleToggleChat} currentUser={displayName} />
          </div>
        )}

        {/* Settings panel */}
        {settingsOpen && (
          <div className="w-80 shrink-0 hidden sm:block">
            <MeetingSettings
              isOpen={settingsOpen} onClose={handleToggleSettings} isHost={isHost}
              roomId={roomId} meetingTitle={meeting?.title || "Meeting"}
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
          <ChatPanel messages={messages} onSend={handleSendMessage} onClose={handleToggleChat} currentUser={displayName} />
        </div>
      )}

      {/* Controls */}
      <ControlsBar
        audioEnabled={audioEnabled} videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio} onToggleVideo={toggleVideo}
        onLeave={handleLeave} onToggleChat={handleToggleChat}
        chatOpen={chatOpen} isHost={isHost}
        onEndMeeting={isHost ? handleEndMeeting : undefined}
        participantCount={totalParticipants} roomId={roomId}
        unreadMessages={unreadMessages}
        onToggleSettings={handleToggleSettings} settingsOpen={settingsOpen}
        onToggleScreenShare={handleToggleScreenShare} isScreenSharing={isScreenSharing}
        onToggleHand={handleToggleHand} handRaised={handRaised}
        onReaction={handleReaction}
      />
    </div>
  );
}
