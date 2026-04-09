import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#060b18] bg-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 glow-border rounded-2xl bg-[#0a1128] p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <h1 className="text-5xl font-extrabold text-white mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-300 mb-4">Page Not Found</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Button
          onClick={() => setLocation("/")}
          className="glow-button text-white border-0 rounded-xl px-6"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-slate-700">
        <Shield className="w-4 h-4" />
        <span className="text-sm">BlueGuard Meet</span>
      </div>
    </div>
  );
}
