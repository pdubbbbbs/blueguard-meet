import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useMediaStream } from "@/hooks/useMediaStream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

export default function Lobby() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId || "";
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const isHost = searchParams.get("host") === "true";
  const nameFromQuery = searchParams.get("name") || "";

  const [displayName, setDisplayName] = useState(nameFromQuery);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { stream, audioEnabled, videoEnabled, error, initStream, toggleAudio, toggleVideo } =
    useMediaStream();

  const { data: meeting, isLoading } = trpc.meeting.getByRoomId.useQuery(
    { roomId },
    { enabled: !!roomId }
  );

  useEffect(() => {
    initStream();
  }, [initStream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleJoin = () => {
    if (!displayName.trim()) return;
    navigate(
      `/meeting/${roomId}?name=${encodeURIComponent(displayName.trim())}&host=${isHost}`
    );
  };

  const inviteLink = `${window.location.origin}/join/${roomId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060b18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#060b18] bg-grid flex items-center justify-center p-4">
        <div className="glow-border rounded-2xl bg-[#0a1128] p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Meeting Not Found</h2>
          <p className="text-slate-400 mb-6">
            This meeting doesn't exist or the link is invalid.
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

  if (!meeting.isActive) {
    return (
      <div className="min-h-screen bg-[#060b18] bg-grid flex items-center justify-center p-4">
        <div className="glow-border rounded-2xl bg-[#0a1128] p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Meeting Ended</h2>
          <p className="text-slate-400 mb-6">This meeting has already ended.</p>
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

  return (
    <div className="min-h-screen bg-[#060b18] bg-grid relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-blue-500/10">
        <div className="container flex items-center h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              BlueGuard <span className="text-blue-400">Meet</span>
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container py-8 lg:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {meeting.title}
            </h1>
            <p className="text-slate-400">
              Hosted by {meeting.hostName} &middot; Ready to join
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div className="glow-border rounded-2xl bg-[#0a1128] overflow-hidden">
              <div className="aspect-video relative bg-[#060b18]">
                {stream && videoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                      <VideoOff className="w-8 h-8 text-blue-400" />
                    </div>
                    <span className="text-slate-500 text-sm">Camera is off</span>
                  </div>
                )}
                {error && (
                  <div className="absolute bottom-3 left-3 right-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-300">
                    {error}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 p-4 border-t border-blue-500/10">
                <button
                  onClick={toggleAudio}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    audioEnabled
                      ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    videoEnabled
                      ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  {videoEnabled ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Join Form */}
            <div className="flex flex-col justify-center">
              <div className="glow-border rounded-2xl bg-[#0a1128] p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  />
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={!displayName.trim()}
                  className="w-full h-11 glow-button text-white font-semibold rounded-xl border-0"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Join Meeting
                </Button>

                {isHost && (
                  <div className="pt-3 border-t border-blue-500/10">
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Share invite link
                    </label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={inviteLink}
                        className="bg-[#060b18] border-blue-500/15 text-slate-300 text-sm h-9 flex-1"
                      />
                      <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 border-blue-500/20 text-blue-400 hover:bg-blue-500/10 bg-transparent"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
