import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  Users, Copy, Check, UserX, Settings, Monitor, MonitorOff,
  Hand, Smile,
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
  onToggleScreenShare?: () => void;
  isScreenSharing?: boolean;
  onToggleHand?: () => void;
  handRaised?: boolean;
  onReaction?: (emoji: string) => void;
}

const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🎉"];

export function ControlsBar({
  audioEnabled, videoEnabled, onToggleAudio, onToggleVideo,
  onLeave, onToggleChat, chatOpen, isHost, onEndMeeting,
  participantCount, roomId, unreadMessages,
  onToggleSettings, settingsOpen = false,
  onToggleScreenShare, isScreenSharing = false,
  onToggleHand, handRaised = false,
  onReaction,
}: ControlsBarProps) {
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0a1128]/90 backdrop-blur-sm border-t border-blue-500/10 px-4 py-3 relative">
      {/* Reactions popup */}
      {showReactions && onReaction && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 bg-[#0a1128] border border-blue-500/20 rounded-xl px-2 py-1.5 shadow-xl">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onReaction(emoji); setShowReactions(false); }}
              className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-xl transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between max-w-5xl mx-auto">
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
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Invite"}</span>
          </button>
        </div>

        {/* Center: main controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mic */}
          <button
            onClick={onToggleAudio}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
              audioEnabled ? "bg-[#162044] text-white hover:bg-[#1e2d5a]" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            }`}
            title={`${audioEnabled ? "Mute" : "Unmute"} (Space)`}
          >
            {audioEnabled ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
          </button>

          {/* Video */}
          <button
            onClick={onToggleVideo}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
              videoEnabled ? "bg-[#162044] text-white hover:bg-[#1e2d5a]" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            }`}
            title={`${videoEnabled ? "Stop" : "Start"} camera (V)`}
          >
            {videoEnabled ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
          </button>

          {/* Screen share */}
          {onToggleScreenShare && (
            <button
              onClick={onToggleScreenShare}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                isScreenSharing ? "bg-green-500/20 text-green-400" : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
              }`}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? <MonitorOff className="w-4.5 h-4.5" /> : <Monitor className="w-4.5 h-4.5" />}
            </button>
          )}

          {/* Hand raise */}
          {onToggleHand && (
            <button
              onClick={onToggleHand}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                handRaised ? "bg-yellow-500/20 text-yellow-400" : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
              }`}
              title={`${handRaised ? "Lower" : "Raise"} hand (H)`}
            >
              <Hand className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Reactions */}
          {onReaction && (
            <button
              onClick={() => setShowReactions(prev => !prev)}
              className={`hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full items-center justify-center transition-all ${
                showReactions ? "bg-blue-500/20 text-blue-400" : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
              }`}
              title="Reactions"
            >
              <Smile className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Chat */}
          <button
            onClick={onToggleChat}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all relative ${
              chatOpen ? "bg-blue-500/20 text-blue-400" : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
            }`}
            title="Chat (C)"
          >
            <MessageSquare className="w-4.5 h-4.5" />
            {unreadMessages > 0 && !chatOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>

          {/* Settings */}
          {onToggleSettings && (
            <button
              onClick={onToggleSettings}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                settingsOpen ? "bg-blue-500/20 text-blue-400" : "bg-[#162044] text-white hover:bg-[#1e2d5a]"
              }`}
              title="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Leave */}
          <button
            onClick={onLeave}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all"
            title="Leave meeting"
          >
            <PhoneOff className="w-4.5 h-4.5" />
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
              End All
            </button>
          )}
          {/* Keyboard shortcuts hint */}
          <div className="hidden lg:block text-[10px] text-slate-600">
            Space: mute · V: cam · C: chat · H: hand · F: fullscreen
          </div>
        </div>
      </div>
    </div>
  );
}
