import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  Copy,
  Check,
  UserX,
  Settings,
} from "lucide-react";
import { useState } from "react";

interface ControlsBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
  isHost: boolean;
  onEndMeeting?: () => void;
  participantCount: number;
  roomId: string;
  unreadMessages: number;
  onToggleSettings?: () => void;
  settingsOpen?: boolean;
}

export function ControlsBar({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave,
  onToggleChat,
  chatOpen,
  isHost,
  onEndMeeting,
  participantCount,
  roomId,
  unreadMessages,
  onToggleSettings,
  settingsOpen = false,
}: ControlsBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0a1128]/90 backdrop-blur-sm border-t border-blue-500/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left: info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>{participantCount}</span>
          </div>
          <button
            onClick={handleCopy}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Copied!" : "Copy link"}</span>
          </button>
        </div>

        {/* Center: main controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleAudio}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
              audioEnabled
                ? "bg-[#162044] text-white hover:bg-[#1e2d5a]"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            }`}
            title={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={onToggleVideo}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
              videoEnabled
                ? "bg-[#162044] text-white hover:bg-[#1e2d5a]"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            }`}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={onToggleChat}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all relative ${
              chatOpen
                ? "bg-blue-500/20 text-blue-400"
                : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
            }`}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessages > 0 && !chatOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>

          {onToggleSettings && (
            <button
              onClick={onToggleSettings}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                settingsOpen
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onLeave}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
            title="Leave meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Right: host controls */}
        <div className="flex items-center gap-2">
          {isHost && onEndMeeting && (
            <button
              onClick={onEndMeeting}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              End for All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
