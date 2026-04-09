import { useState, useEffect } from "react";
import type { Socket } from "socket.io-client";
import {
  X,
  Copy,
  Check,
  Users,
  Crown,
  UserX,
  Link,
  Shield,
  Info,
  Lock,
  Unlock,
  MessageSquareOff,
  MessageSquare,
  MicOff,
  Volume2,
  Clock,
  ShieldCheck,
  UserCheck,
  UserMinus,
} from "lucide-react";

interface Participant {
  id: string;
  displayName: string;
  isHost: boolean;
  isLocal: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface MeetingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  roomId: string;
  meetingTitle: string;
  participants: Participant[];
  onRemoveParticipant?: (id: string) => void;
  onEndMeeting?: () => void;
  socket: Socket;
  startedAt?: number;
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MeetingSettings({
  isOpen,
  onClose,
  isHost,
  roomId,
  meetingTitle,
  participants,
  onRemoveParticipant,
  onEndMeeting,
  socket,
  startedAt,
}: MeetingSettingsProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"participants" | "controls" | "info">("participants");
  const [locked, setLocked] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const inviteLink = `${window.location.origin}/join/${roomId}`;

  // Meeting timer
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Listen for room config updates
  useEffect(() => {
    const handleConfig = (data: { locked?: boolean; chatEnabled?: boolean; startedAt?: number }) => {
      if (data.locked !== undefined) setLocked(data.locked);
      if (data.chatEnabled !== undefined) setChatEnabled(data.chatEnabled);
    };
    socket.on("room-config", handleConfig);
    socket.on("room-config-update", handleConfig);
    return () => {
      socket.off("room-config", handleConfig);
      socket.off("room-config-update", handleConfig);
    };
  }, [socket]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleLock = () => {
    const next = !locked;
    setLocked(next);
    socket.emit("lock-room", { roomId, locked: next });
  };

  const handleToggleChat = () => {
    const next = !chatEnabled;
    setChatEnabled(next);
    socket.emit("toggle-chat", { roomId, enabled: next });
  };

  const handleMuteAll = () => {
    socket.emit("mute-all", { roomId });
  };

  const handleMuteParticipant = (targetSocketId: string) => {
    socket.emit("mute-participant", { roomId, targetSocketId });
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 shrink-0 flex flex-col h-full bg-[#0a1128] border-l border-blue-500/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          {startedAt && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatDuration(elapsed)}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-blue-500/10">
        <button
          onClick={() => setTab("participants")}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            tab === "participants" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Users className="w-3 h-3" />
          People ({participants.length})
        </button>
        {isHost && (
          <button
            onClick={() => setTab("controls")}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              tab === "controls" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            Controls
          </button>
        )}
        <button
          onClick={() => setTab("info")}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            tab === "info" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Info className="w-3 h-3" />
          Info
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "participants" && (
          <div className="p-2">
            {/* Quick actions for host */}
            {isHost && participants.length > 1 && (
              <button
                onClick={handleMuteAll}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mb-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-xs font-medium transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Mute All Participants
              </button>
            )}

            <div className="space-y-0.5">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-400">
                      {p.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {p.isHost && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                      <span className="text-sm text-white truncate">
                        {p.displayName}
                        {p.isLocal && " (You)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] ${p.audioEnabled ? "text-green-400" : "text-red-400"}`}>
                        {p.audioEnabled ? "Mic on" : "Muted"}
                      </span>
                      <span className={`text-[10px] ${p.videoEnabled ? "text-green-400" : "text-red-400"}`}>
                        {p.videoEnabled ? "Cam on" : "Cam off"}
                      </span>
                    </div>
                  </div>
                  {isHost && !p.isLocal && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMuteParticipant(p.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        title="Mute participant"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                      </button>
                      {onRemoveParticipant && (
                        <button
                          onClick={() => onRemoveParticipant(p.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove from meeting"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "controls" && isHost && (
          <div className="p-3 space-y-3">
            {/* Lock meeting */}
            <button
              onClick={handleToggleLock}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                locked
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-white/5 border border-blue-500/10 hover:bg-white/10"
              }`}
            >
              {locked ? (
                <Lock className="w-5 h-5 text-red-400" />
              ) : (
                <Unlock className="w-5 h-5 text-slate-400" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-white">
                  {locked ? "Meeting Locked" : "Lock Meeting"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {locked ? "No one else can join" : "Prevent new participants from joining"}
                </div>
              </div>
            </button>

            {/* Toggle chat */}
            <button
              onClick={handleToggleChat}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                !chatEnabled
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : "bg-white/5 border border-blue-500/10 hover:bg-white/10"
              }`}
            >
              {chatEnabled ? (
                <MessageSquare className="w-5 h-5 text-green-400" />
              ) : (
                <MessageSquareOff className="w-5 h-5 text-yellow-400" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-white">
                  {chatEnabled ? "Chat Enabled" : "Chat Disabled"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {chatEnabled ? "Participants can send messages" : "Chat is turned off for everyone"}
                </div>
              </div>
            </button>

            {/* Mute all */}
            <button
              onClick={handleMuteAll}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-blue-500/10 hover:bg-white/10 transition-colors"
            >
              <Volume2 className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <div className="text-sm font-medium text-white">Mute All</div>
                <div className="text-[11px] text-slate-500">Mute all participants at once</div>
              </div>
            </button>

            {/* End meeting */}
            {onEndMeeting && (
              <button
                onClick={onEndMeeting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                <UserMinus className="w-5 h-5 text-red-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-red-400">End Meeting for All</div>
                  <div className="text-[11px] text-slate-500">Ends the meeting and removes everyone</div>
                </div>
              </button>
            )}

            {/* Meeting stats */}
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-blue-500/10">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Meeting Stats</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">Participants</div>
                <div className="text-white font-medium">{participants.length} / 10</div>
                <div className="text-slate-400">Duration</div>
                <div className="text-white font-medium font-mono">{formatDuration(elapsed)}</div>
                <div className="text-slate-400">Room Status</div>
                <div className={locked ? "text-red-400 font-medium" : "text-green-400 font-medium"}>
                  {locked ? "Locked" : "Open"}
                </div>
                <div className="text-slate-400">Chat</div>
                <div className={chatEnabled ? "text-green-400 font-medium" : "text-yellow-400 font-medium"}>
                  {chatEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "info" && (
          <div className="p-3 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Title</label>
              <p className="text-sm text-white mt-1">{meetingTitle}</p>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Room ID</label>
              <p className="text-xs text-slate-400 mt-1 font-mono">{roomId}</p>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Invite Link</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-[#060b18] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-slate-300 truncate">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors"
            >
              <Link className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy Invite Link"}
            </button>

            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">End-to-End Encrypted</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                WebRTC peer-to-peer — video and audio go directly between participants, not through any server.
              </p>
            </div>

            <div className="bg-white/5 border border-blue-500/10 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Connection</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="text-slate-400">Protocol</div>
                <div className="text-white">WebRTC P2P</div>
                <div className="text-slate-400">Signaling</div>
                <div className="text-white">Socket.IO / WSS</div>
                <div className="text-slate-400">ICE</div>
                <div className="text-white">STUN (Google)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
