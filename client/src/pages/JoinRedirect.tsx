import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function JoinRedirect() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId || "";
  const [, navigate] = useLocation();

  useEffect(() => {
    if (roomId) {
      navigate(`/lobby/${roomId}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [roomId, navigate]);

  return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
