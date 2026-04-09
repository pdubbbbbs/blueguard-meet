import { useEffect, useRef, useCallback } from "react";
import { MicOff, VideoOff, Crown, Hand, Pin, PictureInPicture2 } from "lucide-react";

interface VideoTileProps {
  stream?: MediaStream;
  displayName: string;
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
  onRemove?: () => void;
  showRemove?: boolean;
  handRaised?: boolean;
  onPin?: () => void;
  isPinned?: boolean;
}

export function VideoTile({
  stream,
  displayName,
  isHost,
  audioEnabled,
  videoEnabled,
  isLocal = false,
  onRemove,
  showRemove = false,
  handRaised = false,
  onPin,
  isPinned = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-tile aspect-video relative group ${handRaised ? "ring-2 ring-yellow-400/50" : ""}`}>
      {stream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={isLocal ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a1128]">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
            <span className="text-xl sm:text-2xl font-bold text-blue-400">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!videoEnabled && <VideoOff className="w-4 h-4 text-slate-600 mt-1" />}
        </div>
      )}

      {/* Hand raised indicator */}
      {handRaised && (
        <div className="absolute top-2 left-2 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 backdrop-blur-sm flex items-center justify-center">
            <Hand className="w-4 h-4 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Pin button */}
      {onPin && (
        <button
          onClick={onPin}
          className={`absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center transition-all ${
            isPinned
              ? "bg-blue-500/30 text-blue-400"
              : "opacity-0 group-hover:opacity-100 bg-black/50 text-white hover:bg-blue-500/30"
          }`}
          title={isPinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:p-3">
        <div className="flex items-center gap-1.5">
          {isHost && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
          <span className="text-white text-xs sm:text-sm font-medium truncate">
            {displayName}
            {isLocal && " (You)"}
          </span>
          {!audioEnabled && (
            <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0 ml-auto" />
          )}
        </div>
      </div>

      {/* PiP button */}
      {stream && videoEnabled && !isLocal && (
        <button
          onClick={() => {
            if (videoRef.current && document.pictureInPictureEnabled) {
              videoRef.current.requestPictureInPicture().catch(() => {});
            }
          }}
          className="absolute top-2 left-10 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md bg-black/50 text-white hover:bg-blue-500/30 flex items-center justify-center"
          title="Picture-in-Picture"
        >
          <PictureInPicture2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Remove button (host only) */}
      {showRemove && !isLocal && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-500 text-white text-xs px-2 py-1 rounded-md"
        >
          Remove
        </button>
      )}
    </div>
  );
}
