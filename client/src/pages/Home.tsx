import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video,
  Users,
  Shield,
  ArrowRight,
  Plus,
  LogIn,
  Zap,
  Lock,
  Globe,
  Settings,
  KeyRound,
  LogOut,
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const [hostName, setHostName] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("join");
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status on mount via cookie
  useState(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.admin) {
          setIsAdmin(true);
          setActiveTab("create");
        }
      })
      .catch(() => {});
  });

  const handleAdminLogin = () => {
    const key = prompt("Enter admin key:");
    if (!key) return;
    fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setIsAdmin(true);
          setActiveTab("create");
        } else {
          alert("Invalid admin key");
        }
      })
      .catch(() => alert("Login failed"));
  };

  const handleAdminLogout = () => {
    fetch("/api/admin/logout", { method: "POST", credentials: "include" })
      .then(() => {
        setIsAdmin(false);
        setActiveTab("join");
      })
      .catch(() => {});
  };

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: (meeting) => {
      if (meeting) {
        // Store hostSecret securely in sessionStorage (not in URL)
        if (meeting.hostSecret) {
          sessionStorage.setItem(`hostSecret:${meeting.roomId}`, meeting.hostSecret);
        }
        navigate(`/lobby/${meeting.roomId}?host=true&name=${encodeURIComponent(hostName)}`);
      }
    },
  });

  const handleCreate = () => {
    if (!hostName.trim() || !meetingTitle.trim()) return;
    createMeeting.mutate({
      title: meetingTitle.trim(),
      hostName: hostName.trim(),
    });
  };

  const handleJoin = () => {
    if (!joinRoomId.trim()) return;
    const cleanId = joinRoomId.trim().replace(/.*\/join\//, "").replace(/.*\/lobby\//, "");
    navigate(`/lobby/${cleanId}`);
  };

  return (
    <div className="min-h-screen bg-[#060b18] bg-grid relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

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
                className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors text-sm"
                title="Logged in as admin"
              >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleAdminLogin}
                className="text-slate-500 hover:text-blue-400 transition-colors"
                title="Admin login"
              >
                <KeyRound className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              onClick={() => navigate("/settings")}
              className="text-slate-500 hover:text-blue-400 transition-colors"
              title="Settings"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
            <a
              href="https://bluetoothdefense.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
            >
              bluetoothdefense.com
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 container">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-16 lg:py-24">
          {/* Left: Hero text */}
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
              Join secure video calls instantly. No account required.
              End-to-end peer-to-peer connections for up to 10 participants.
            </p>
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                <span>P2P Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Up to 10 Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>No Account Needed</span>
              </div>
            </div>
          </div>

          {/* Right: Create/Join card */}
          <div className="w-full max-w-md">
            <div className="glow-border rounded-2xl bg-[#0a1128]/80 backdrop-blur-sm p-1">
              {/* Tabs — Create only visible to admin */}
              <div className="flex mb-1">
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab("create")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "create"
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    New Meeting
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("join")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === "join"
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-slate-500 hover:text-slate-300"
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
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Your Name
                      </label>
                      <Input
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="Enter your name"
                        className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Meeting Title
                      </label>
                      <Input
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
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
                      {createMeeting.isPending ? (
                        "Creating..."
                      ) : (
                        <>
                          <Video className="w-4 h-4 mr-2" />
                          Create Meeting
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Meeting ID or Link
                      </label>
                      <Input
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        placeholder="Enter meeting ID or paste invite link"
                        className="bg-[#060b18] border-blue-500/15 text-white placeholder:text-slate-600 focus:border-blue-500/40 h-11"
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      />
                    </div>
                    <Button
                      onClick={handleJoin}
                      disabled={!joinRoomId.trim()}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
          {[
            {
              icon: Video,
              title: "HD Video Calls",
              desc: "Crystal-clear video and audio with WebRTC peer-to-peer technology.",
            },
            {
              icon: Shield,
              title: "Secure by Design",
              desc: "Direct peer connections mean your data never passes through third-party servers.",
            },
            {
              icon: Users,
              title: "Instant Collaboration",
              desc: "Share a link and start collaborating. In-call chat keeps everyone connected.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glow-border rounded-xl bg-[#0a1128]/60 p-6 hover:bg-[#0a1128]/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-blue-500/10 py-6">
        <div className="container text-center text-sm text-slate-600">
          &copy; {new Date().getFullYear()} BlueGuard &mdash; bluetoothdefense.com
        </div>
      </footer>
    </div>
  );
}
