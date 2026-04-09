import { useCallback, useEffect, useRef, useState } from "react";

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initStream = useCallback(async () => {
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setVideoEnabled(false);
        } catch {
          setVideoEnabled(false);
          setAudioEnabled(false);
          setError("No camera or microphone available. You can still join.");
          return null;
        }
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch (err: any) {
      setError("Failed to access media devices.");
      return null;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (!streamRef.current) return;
    const tracks = streamRef.current.getAudioTracks();
    for (const track of tracks) {
      track.enabled = !track.enabled;
    }
    setAudioEnabled(tracks.length > 0 ? tracks[0].enabled : false);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!streamRef.current) return;
    const tracks = streamRef.current.getVideoTracks();
    for (const track of tracks) {
      track.enabled = !track.enabled;
    }
    setVideoEnabled(tracks.length > 0 ? tracks[0].enabled : false);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    audioEnabled,
    videoEnabled,
    error,
    initStream,
    toggleAudio,
    toggleVideo,
    stopStream,
  };
}
