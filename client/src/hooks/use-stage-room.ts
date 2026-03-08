import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { ws } from '@shared/routes';
import { z } from 'zod';
import { useToast } from './use-toast';

export type Participant = z.infer<typeof ws.receive.stageState>['participants'][0];
export type ChatMessage = z.infer<typeof ws.receive.message>;
export type StageAnnouncement = z.infer<typeof ws.receive.announcement>;

interface UseStageRoomProps {
  stageSlug: string;
  displayName: string;
  isAdmin: boolean;
}

export function useStageRoom({ stageSlug, displayName, isAdmin }: UseStageRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<StageAnnouncement[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const { toast } = useToast();

  const me = participants.find(p => p.displayName === displayName);
  const myRole = me?.role || 'audience';

  // Helper to securely parse socket events
  const safeParse = <T>(schema: z.ZodSchema<T>, data: unknown): T | null => {
    const res = schema.safeParse(data);
    if (!res.success) {
      console.error("Socket Payload Parse Error:", res.error);
      return null;
    }
    return res.data;
  };

  // Initialize Socket
  useEffect(() => {
    if (!stageSlug || !displayName) return;

    const newSocket = io({ path: '/socket.io' });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('joinStage', { stageSlug, displayName, isAdmin });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [stageSlug, displayName, isAdmin]);

  // Handle Room State
  useEffect(() => {
    if (!socket) return;

    socket.on('stageState', (data) => {
      const parsed = safeParse(ws.receive.stageState, data);
      if (parsed) {
        setParticipants(parsed.participants);
        setViewerCount(parsed.viewerCount);
        setAnnouncements(parsed.announcements);
      }
    });

    socket.on('participantJoined', (data) => {
      const parsed = safeParse(ws.receive.participantJoined, data);
      if (parsed) {
        setParticipants(prev => [...prev.filter(p => p.id !== parsed.participant.id), parsed.participant]);
        setViewerCount(parsed.viewerCount);
      }
    });

    socket.on('participantLeft', (data) => {
      const parsed = safeParse(ws.receive.participantLeft, data);
      if (parsed) {
        setParticipants(prev => prev.filter(p => p.id !== parsed.participantId));
        setViewerCount(parsed.viewerCount);
        // Clean up peer if they left
        if (peersRef.current[parsed.participantId]) {
          peersRef.current[parsed.participantId].destroy();
          delete peersRef.current[parsed.participantId];
          setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[parsed.participantId];
            return next;
          });
        }
      }
    });

    socket.on('participantUpdated', (data) => {
      const parsed = safeParse(ws.receive.participantUpdated, data);
      if (parsed) {
        setParticipants(prev => prev.map(p => p.id === parsed.participant.id ? parsed.participant : p));
      }
    });

    socket.on('message', (data) => {
      const parsed = safeParse(ws.receive.message, data);
      if (parsed) {
        setMessages(prev => [...prev, parsed]);
      }
    });

    socket.on('announcement', (data) => {
      const parsed = safeParse(ws.receive.announcement, data);
      if (parsed) {
        setAnnouncements(prev => [...prev, parsed]);
      }
    });

    return () => {
      socket.off('stageState');
      socket.off('participantJoined');
      socket.off('participantLeft');
      socket.off('participantUpdated');
      socket.off('message');
      socket.off('announcement');
    };
  }, [socket]);

  // WebRTC Setup (When becoming a speaker)
  useEffect(() => {
    if (!socket || !me) return;

    if ((me.role === 'speaker' || me.role === 'admin') && !localStream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setLocalStream(stream);
          setIsMicOn(true);
          setIsVideoOn(true);
          
          // I am a new speaker, initiate peers with existing speakers
          const otherSpeakers = participants.filter(p => 
            (p.role === 'speaker' || p.role === 'admin') && p.id !== me.id
          );
          
          otherSpeakers.forEach(speaker => {
            if (peersRef.current[speaker.id]) return;
            
            const peer = new Peer({
              initiator: true,
              stream: stream,
              trickle: true,
            });

            peer.on('signal', signal => {
              socket.emit('signal', { stageSlug, targetId: speaker.id, signal });
            });

            peer.on('stream', remoteStream => {
              setRemoteStreams(prev => ({ ...prev, [speaker.id]: remoteStream }));
            });

            peersRef.current[speaker.id] = peer;
          });
        })
        .catch(err => {
          console.error("Media Device Error:", err);
          toast({
            title: "Camera/Mic Error",
            description: "Could not access your devices. Check permissions.",
            variant: "destructive"
          });
        });
    }

    if (me.role === 'audience' && localStream) {
      // Stopped being a speaker
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      setIsMicOn(false);
      setIsVideoOn(false);
      
      // Destroy all outgoing peers
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      setRemoteStreams({});
    }
  }, [me?.role, socket, participants, stageSlug, localStream, toast]);

  // WebRTC Signaling Handler
  useEffect(() => {
    if (!socket || !me || !localStream) return;

    const handleSignal = (data: any) => {
      const parsed = safeParse(ws.receive.signal, data);
      if (!parsed) return;
      
      const { senderId, signal } = parsed;
      
      let peer = peersRef.current[senderId];
      
      if (!peer) {
        // We received a signal from someone else initiating
        peer = new Peer({
          initiator: false,
          stream: localStream,
          trickle: true,
        });

        peer.on('signal', responseSignal => {
          socket.emit('signal', { stageSlug, targetId: senderId, signal: responseSignal });
        });

        peer.on('stream', remoteStream => {
          setRemoteStreams(prev => ({ ...prev, [senderId]: remoteStream }));
        });

        peersRef.current[senderId] = peer;
      }

      peer.signal(signal);
    };

    socket.on('signal', handleSignal);
    return () => { socket.off('signal', handleSignal); };
  }, [socket, me, localStream, stageSlug]);


  // Media Controls
  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Actions
  const sendMessage = useCallback((content: string) => {
    if (socket) socket.emit('sendMessage', { stageSlug, content });
  }, [socket, stageSlug]);

  const sendAnnouncement = useCallback((content: string) => {
    if (socket && isAdmin) socket.emit('sendAnnouncement', { stageSlug, content });
  }, [socket, stageSlug, isAdmin]);

  const requestToSpeak = useCallback(() => {
    if (socket) socket.emit('requestToSpeak', { stageSlug });
  }, [socket, stageSlug]);

  const cancelRequestToSpeak = useCallback(() => {
    if (socket) socket.emit('cancelRequestToSpeak', { stageSlug });
  }, [socket, stageSlug]);

  const approveSpeaker = useCallback((participantId: string) => {
    if (socket && isAdmin) socket.emit('approveSpeaker', { stageSlug, participantId });
  }, [socket, stageSlug, isAdmin]);

  const removeSpeaker = useCallback((participantId: string) => {
    if (socket && isAdmin) socket.emit('removeSpeaker', { stageSlug, participantId });
  }, [socket, stageSlug, isAdmin]);

  return {
    participants,
    messages,
    announcements,
    viewerCount,
    isConnected,
    localStream,
    remoteStreams,
    myRole,
    me,
    isMicOn,
    isVideoOn,
    toggleMic,
    toggleVideo,
    sendMessage,
    sendAnnouncement,
    requestToSpeak,
    cancelRequestToSpeak,
    approveSpeaker,
    removeSpeaker
  };
}
