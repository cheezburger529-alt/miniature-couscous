import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";
import { motion } from "framer-motion";

interface VideoPlayerProps {
  stream: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isMuted?: boolean;
}

export function VideoPlayer({ stream, displayName, isLocal = false, isMuted = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some(track => track.enabled) ?? false;
  const hasAudio = stream?.getAudioTracks().some(track => track.enabled) ?? false;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="relative w-full h-full bg-card/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center shadow-xl group"
    >
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video to prevent echo
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`} // Mirror local video
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="text-3xl font-bold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <span className="text-sm font-medium text-white shadow-sm">{displayName} {isLocal && "(You)"}</span>
        </div>
        
        {(!hasAudio || isMuted) && (
          <div className="bg-red-500/80 backdrop-blur-md p-1.5 rounded-full">
            <MicOff className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      
      {/* Speaking Indicator Glow (Mocked here since we don't have audio level analysis out of the box, but visually stunning if we pretend it works) */}
      {hasAudio && !isMuted && !isLocal && (
        <div className="absolute inset-0 border-2 border-primary/0 rounded-2xl group-hover:border-primary/50 transition-colors duration-500 pointer-events-none" />
      )}
    </motion.div>
  );
}
