import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { VideoTile } from "@/components/VideoTile";
import { Shield } from "lucide-react";

/**
 * Pop-out gallery window — shows ONLY the video grid.
 * Communicates with the main meeting window via BroadcastChannel.
 */
export default function GalleryPopout() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId || "";
  const [participants, setParticipants] = useState<any[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("Meeting");
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(`blueguard-meet-${roomId}`);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === "participants-update") {
        setParticipants(data.participants);
        setMeetingTitle(data.title || "Meeting");
      }
    };

    // Request initial state
    channel.postMessage({ type: "request-state" });

    return () => channel.close();
  }, [roomId]);

  const count = participants.length;
  const getGridCols = () => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="h-screen flex flex-col bg-[#060b18]">
      <header className="bg-[#0a1128]/80 border-b border-blue-500/10 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">{meetingTitle}</span>
          <span className="text-xs text-slate-500">— Gallery View</span>
          <span className="text-xs text-slate-600 ml-auto">{count} participants</span>
        </div>
      </header>
      <div className="flex-1 p-3 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Waiting for participants...
          </div>
        ) : (
          <div className={`grid ${getGridCols()} gap-2 h-full auto-rows-fr`}>
            {participants.map((p: any) => (
              <VideoTile
                key={p.id}
                displayName={p.displayName}
                isHost={p.isHost}
                audioEnabled={p.audioEnabled}
                videoEnabled={p.videoEnabled}
                isLocal={p.isLocal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
