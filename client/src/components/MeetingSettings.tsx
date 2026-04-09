import { useState } from "react";
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
}: MeetingSettingsProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"participants" | "info">("participants");
  const inviteLink = `${window.location.origin}/join/${roomId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 shrink-0 flex flex-col h-full bg-[#0a1128] border-l border-blue-500/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Meeting Settings</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-blue-500/10">
        <button
          onClick={() => setTab("participants")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "participants"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Participants ({participants.length})
        </button>
        <button
          onClick={() => setTab("info")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "info"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          Meeting Info
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "participants" ? (
          <div className="space-y-1">
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
                {isHost && !p.isLocal && onRemoveParticipant && (
                  <button
                    onClick={() => onRemoveParticipant(p.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Remove participant"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meeting title */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Meeting Title
              </label>
              <p className="text-sm text-white mt-1">{meetingTitle}</p>
            </div>

            {/* Room ID */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Room ID
              </label>
              <p className="text-xs text-slate-400 mt-1 font-mono">{roomId}</p>
            </div>

            {/* Invite link */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Invite Link
              </label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-[#060b18] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-slate-300 truncate">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors shrink-0"
                  title="Copy invite link"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Share via */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Share
              </label>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors"
                >
                  <Link className="w-3.5 h-3.5" />
                  Copy Link
                </button>
              </div>
            </div>

            {/* Security info */}
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Secure Connection</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This meeting uses WebRTC peer-to-peer encryption.
                Video and audio are sent directly between participants.
              </p>
            </div>

            {/* Host controls */}
            {isHost && onEndMeeting && (
              <div className="pt-2 border-t border-blue-500/10">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  Host Controls
                </label>
                <button
                  onClick={onEndMeeting}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
                >
                  End Meeting for All
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
