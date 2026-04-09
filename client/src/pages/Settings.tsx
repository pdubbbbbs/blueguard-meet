import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowLeft,
  ShieldCheck,
  Server,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();

  const { data: iceData, isLoading: iceLoading } = trpc.ice.getServers.useQuery(undefined, {
    staleTime: 0,
  });

  return (
    <div className="min-h-screen bg-[#060b18] bg-grid relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-blue-500/10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              BlueGuard <span className="text-blue-400">Settings</span>
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container py-10 max-w-3xl mx-auto px-4">
        {/* TURN Server Status */}
        <section className="mb-8">
          <div className="glow-border rounded-2xl bg-[#0a1128]/80 backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-blue-500/10">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">TURN Server Configuration</h2>
                  <p className="text-sm text-slate-500">
                    Relay server for NAT traversal in WebRTC connections
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status indicator */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[#060b18]/60 border border-blue-500/10">
                {iceLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Checking configuration...</p>
                    </div>
                  </>
                ) : iceData?.turnConfigured ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-400">TURN Server Active</p>
                      <p className="text-sm text-slate-400 mt-1">
                        A TURN relay server is configured and will be used for connections that
                        cannot establish direct peer-to-peer links. This ensures reliable
                        connectivity even behind strict corporate firewalls and symmetric NATs.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">STUN Only (No TURN)</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Only STUN servers are configured. Direct peer-to-peer connections will work
                        for most users, but participants behind strict corporate firewalls or
                        symmetric NATs may experience connection failures.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* ICE Servers list */}
              {iceData && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    Active ICE Servers ({iceData.iceServers.length})
                  </h3>
                  <div className="space-y-2">
                    {iceData.iceServers.map((server, i) => {
                      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                      const isTurn = urls.some((u) => u.startsWith("turn:") || u.startsWith("turns:")) || !!server.username;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#060b18]/40 border border-blue-500/5"
                        >
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center ${
                              isTurn ? "bg-blue-500/10" : "bg-slate-500/10"
                            }`}
                          >
                            {isTurn ? (
                              <ShieldCheck className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Server className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-slate-300 truncate">
                              {urls.join(", ")}
                            </p>
                            <p className="text-xs text-slate-600">
                              {isTurn ? "TURN Relay" : "STUN Discovery"}
                              {server.username && " · Authenticated"}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isTurn
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {isTurn ? "TURN" : "STUN"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info box */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-400 leading-relaxed">
                  <p className="mb-2">
                    <strong className="text-slate-300">STUN servers</strong> help discover your
                    public IP address for direct peer-to-peer connections. They are free and
                    lightweight.
                  </p>
                  <p>
                    <strong className="text-slate-300">TURN servers</strong> act as relay points
                    when direct connections fail. They require more bandwidth and are typically
                    paid services. Popular providers include{" "}
                    <a
                      href="https://www.metered.ca/tools/openrelay/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Metered.ca
                    </a>
                    ,{" "}
                    <a
                      href="https://www.twilio.com/stun-turn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Twilio
                    </a>
                    , and self-hosted{" "}
                    <a
                      href="https://github.com/coturn/coturn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Coturn
                    </a>
                    .
                  </p>
                </div>
              </div>

              {/* Configuration instructions */}
              <div className="p-4 rounded-xl bg-[#060b18]/60 border border-blue-500/10">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">
                  How to Configure TURN
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  Set the following environment variables in your project settings:
                </p>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2 rounded bg-[#060b18] text-slate-400">
                    <span className="text-blue-400">TURN_SERVER_URL</span>=turn:your-server.com:443
                  </div>
                  <div className="p-2 rounded bg-[#060b18] text-slate-400">
                    <span className="text-blue-400">TURN_SERVER_USERNAME</span>=your-api-key
                  </div>
                  <div className="p-2 rounded bg-[#060b18] text-slate-400">
                    <span className="text-blue-400">TURN_SERVER_CREDENTIAL</span>=your-credential
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  Multiple TURN URLs can be comma-separated. Changes take effect on the next
                  meeting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Back button */}
        <div className="text-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="border-blue-500/20 text-slate-300 hover:bg-blue-500/5 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </main>
    </div>
  );
}
