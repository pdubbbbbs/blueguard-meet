import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video, Users, Shield, ArrowRight, Plus, LogIn, Zap, Lock, Globe,
  KeyRound, LogOut, Monitor, Hand, MessageSquare, X,
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const [hostName, setHostName] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("join");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginKey, setLoginKey] = useState("");
  const [loginError, setLoginError] = useState("");

  // Check admin status on mount
  useEffect(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.admin) {
          setIsAdmin(true);
          setActiveTab("create");
        }
      })
      .catch(() => {});
  }, []);

  const handleAdminLogin = () => {
    if (!loginKey.trim()) return;
    setLoginError("");
    fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key: loginKey.trim() }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setIsAdmin(true);
          setActiveTab("create");
          setShowLoginModal(false);
          setLoginKey("");
        } else {
          setLoginError("Invalid key");
        }
      })
      .catch(() => setLoginError("Connection failed"));
  };

  const handleAdminLogout = () => {
    fetch("/api/admin/logout", { method: "POST", credentials: "include" })
      .then(() => { setIsAdmin(false); setActiveTab("join"); })
      .catch(() => {});
  };

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: (meeting) => {
      if (meeting) {
        if (meeting.hostSecret) {
          sessionStorage.setItem(`hostSecret:${meeting.roomId}`, meeting.hostSecret);
        }
        navigate(`/lobby/${meeting.roomId}?host=true&name=${encodeURIComponent(hostName)}`);
      }
    },
  });

  const handleCreate = () => {
    if (!hostName.trim() || !meetingTitle.trim()) return;
    createMeeting.mutate({ title: meetingTitle.trim(), hostName: hostName.trim() });
  };

  const handleJoin = () => {
    if (!joinRoomId.trim()) return;
    const cleanId = joinRoomId.trim().replace(/.*\/join\//, "").replace(/.*\/lobby\//, "");
    navigate(`/lobby/${cleanId}`);
  };

  return (
    <div className="min-h-screen bg-[#060b18] bg-grid relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Admin login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glow-border rounded-2xl bg-[#0a1128] p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Admin Login</h2>
              </div>
              <button onClick={() => { setShowLoginModal(false); setLoginError(""); }} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                type="password"
                value={loginKey}
                onChange={(e) => { setLoginKey(e.target.value); setLoginError(""); }}
                placeholder="Enter admin key"
                className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                autoFocus
              />
              {loginError && <p className="text-xs text-red-400">{loginError}</p>}
              <Button onClick={handleAdminLogin} className="w-full h-11 glow-button text-white font-semibold rounded-xl border-0">
                <KeyRound className="w-4 h-4 mr-2" />
                Authenticate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-blue-500/10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              BlueGuard <span className="text-blue-400">Meet</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium"
                title="Logged in as admin — click to logout"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-slate-600 hover:text-blue-400 transition-colors"
                title="Admin"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            )}
            <a
              href="https://bluetoothdefense.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm text-slate-500 hover:text-blue-400 transition-colors"
            >
              bluetoothdefense.com
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 container">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-12 lg:py-20">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              Secure P2P Video Conferencing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Premium Video
              <br />
              <span className="glow-text">Meetings</span> Made
              <br />
              Simple
            </h1>
            <p className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed">
              Secure video calls with end-to-end peer-to-peer encryption.
              No downloads. No accounts. Just click and connect.
            </p>
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-slate-500">
              <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-blue-500" /><span>P2P Encrypted</span></div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /><span>Up to 10 Users</span></div>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /><span>No Account Needed</span></div>
            </div>
          </div>

          {/* Create/Join card */}
          <div className="w-full max-w-md">
            <div className="glow-border rounded-2xl bg-[#0a1128]/80 backdrop-blur-sm p-1">
              <div className="flex mb-1">
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab("create")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "create" ? "bg-blue-500/10 text-blue-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    New Meeting
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("join")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === "join" ? "bg-blue-500/10 text-blue-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Join Meeting
                </button>
              </div>

              <div className="p-5">
                {activeTab === "create" && isAdmin ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name</label>
                      <Input
                        value={hostName} onChange={(e) => setHostName(e.target.value)}
                        placeholder="Enter your name"
                        className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Meeting Title</label>
                      <Input
                        value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="e.g. Team Standup"
                        className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                    <Button
                      onClick={handleCreate}
                      disabled={!hostName.trim() || !meetingTitle.trim() || createMeeting.isPending}
                      className="w-full h-11 glow-button text-white font-semibold rounded-xl border-0"
                    >
                      {createMeeting.isPending ? "Creating..." : (<><Video className="w-4 h-4 mr-2" />Create Meeting</>)}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Meeting ID or Link</label>
                      <Input
                        value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)}
                        placeholder="Paste meeting ID or invite link"
                        className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      />
                    </div>
                    <Button
                      onClick={handleJoin} disabled={!joinRoomId.trim()}
                      className="w-full h-11 glow-button text-white font-semibold rounded-xl border-0"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Join Meeting
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">
          {[
            { icon: Video, title: "HD Video & Audio", desc: "Crystal-clear WebRTC calls with adaptive quality." },
            { icon: Shield, title: "Zero-Trust Security", desc: "Peer-to-peer encryption. Your data never touches our servers." },
            { icon: Monitor, title: "Screen Sharing", desc: "Share your screen, a window, or a specific display." },
            { icon: Hand, title: "Reactions & Hand Raise", desc: "Emoji reactions, raise hand, and in-call engagement tools." },
            { icon: MessageSquare, title: "In-Call Chat", desc: "Real-time messaging alongside video for links and notes." },
            { icon: Users, title: "Host Controls", desc: "Lock meeting, mute all, remove participants, waiting room." },
          ].map((f) => (
            <div key={f.title} className="glow-border rounded-xl bg-[#0a1128]/60 p-5 hover:bg-[#0a1128]/80 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <f.icon className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-blue-500/10 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>&copy; {new Date().getFullYear()} BlueGuard Security LLC</span>
          <span>No data collected. No tracking. Self-hosted.</span>
          <a href="https://bluetoothdefense.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            bluetoothdefense.com
          </a>
        </div>
      </footer>
    </div>
  );
}
