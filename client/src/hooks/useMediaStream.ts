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
          setError("Camera/mic denied. Use the toggle buttons to enable them.");
          return null;
        }
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch {
      setError("Failed to access media devices.");
      return null;
    }
  }, []);

  const toggleAudio = useCallback(async () => {
    const current = streamRef.current;

    // If we have audio tracks, just toggle them
    if (current) {
      const tracks = current.getAudioTracks();
      if (tracks.length > 0) {
        for (const track of tracks) {
          track.enabled = !track.enabled;
        }
        setAudioEnabled(tracks[0].enabled);
        return;
      }
    }

    // No audio tracks — request mic permission
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const audioTrack = newStream.getAudioTracks()[0];
      if (audioTrack) {
        if (current) {
          current.addTrack(audioTrack);
        } else {
          streamRef.current = newStream;
          setStream(newStream);
        }
        setAudioEnabled(true);
        setError(null);
      }
    } catch {
      setError("Mic access denied. Check browser site settings.");
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    const current = streamRef.current;

    // If we have video tracks, just toggle them
    if (current) {
      const tracks = current.getVideoTracks();
      if (tracks.length > 0) {
        for (const track of tracks) {
          track.enabled = !track.enabled;
        }
        setVideoEnabled(tracks[0].enabled);
        return;
      }
    }

    // No video tracks — request camera permission
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        if (current) {
          current.addTrack(videoTrack);
        } else {
          streamRef.current = newStream;
          setStream(newStream);
        }
        setVideoEnabled(true);
        setError(null);
      }
    } catch {
      setError("Camera access denied. Check browser site settings.");
    }
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
