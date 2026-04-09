import { useEffect, useState } from "react";
import { Camera, Mic, Monitor, ChevronDown } from "lucide-react";

interface DeviceSelectorProps {
  onSelectCamera: (deviceId: string) => void;
  onSelectMic: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  currentCameraId?: string;
  currentMicId?: string;
  currentSpeakerId?: string;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
}

export function DeviceSelector({
  onSelectCamera,
  onSelectMic,
  onSelectSpeaker,
  currentCameraId,
  currentMicId,
  currentSpeakerId,
}: DeviceSelectorProps) {
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    async function loadDevices() {
      try {
        // Need permission first to get labels
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(s => {
          s.getTracks().forEach(t => t.stop());
        }).catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter(d => d.kind === "videoinput").map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        })));
        setMics(devices.filter(d => d.kind === "audioinput").map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        })));
        setSpeakers(devices.filter(d => d.kind === "audiooutput").map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        })));
      } catch {
        // Permission denied or error
      }
    }
    loadDevices();

    // Refresh when devices change (plug/unplug)
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
  }, []);

  return (
    <div className="space-y-3">
      {/* Camera */}
      {cameras.length > 0 && (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
            <Camera className="w-3 h-3" />
            Camera
          </label>
          <div className="relative">
            <select
              value={currentCameraId || ""}
              onChange={(e) => onSelectCamera(e.target.value)}
              className="w-full bg-[#060b18] border border-blue-500/15 rounded-lg px-3 py-2 pr-8 text-xs text-white appearance-none cursor-pointer focus:border-blue-500/40 focus:outline-none"
            >
              {cameras.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Microphone */}
      {mics.length > 0 && (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
            <Mic className="w-3 h-3" />
            Microphone
          </label>
          <div className="relative">
            <select
              value={currentMicId || ""}
              onChange={(e) => onSelectMic(e.target.value)}
              className="w-full bg-[#060b18] border border-blue-500/15 rounded-lg px-3 py-2 pr-8 text-xs text-white appearance-none cursor-pointer focus:border-blue-500/40 focus:outline-none"
            >
              {mics.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Speaker */}
      {speakers.length > 0 && (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
            <Monitor className="w-3 h-3" />
            Speaker
          </label>
          <div className="relative">
            <select
              value={currentSpeakerId || ""}
              onChange={(e) => onSelectSpeaker(e.target.value)}
              className="w-full bg-[#060b18] border border-blue-500/15 rounded-lg px-3 py-2 pr-8 text-xs text-white appearance-none cursor-pointer focus:border-blue-500/40 focus:outline-none"
            >
              {speakers.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {cameras.length === 0 && mics.length === 0 && (
        <p className="text-xs text-slate-500">No devices detected. Grant camera/mic permission first.</p>
      )}
    </div>
  );
}
