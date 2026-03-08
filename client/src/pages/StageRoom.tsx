import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useStageRoom } from "@/hooks/use-stage-room";
import { useAdmin } from "@/hooks/use-admin";
import { useProfileStore, SetupProfileDialog } from "@/components/SetupProfileDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Users, Settings, LogOut, Check, X, Crown, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StageRoom() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { data: auth, isLoading: isAdminLoading } = useAdmin();
  const displayName = useProfileStore(s => s.displayName);
  const [profileDialogOpen, setProfileDialogOpen] = useState(!displayName);

  if (isAdminLoading) return null;

  if (!displayName) {
    return <SetupProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />;
  }

  return <StageRoomInner slug={slug!} displayName={displayName} isAdmin={!!auth?.isAuthenticated} onLeave={() => setLocation('/')} />;
}

function StageRoomInner({ slug, displayName, isAdmin, onLeave }: { slug: string, displayName: string, isAdmin: boolean, onLeave: () => void }) {
  const {
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
  } = useStageRoom({ stageSlug: slug, displayName, isAdmin });

  const [chatInput, setChatInput] = useState("");
  const [announcementInput, setAnnouncementInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = announcementInput.trim();
    if (!content) return;
    if (isAdmin) {
      sendAnnouncement(content);
      setAnnouncementInput("");
    }
  };

  const speakers = participants.filter(p => p.role === 'speaker' || p.role === 'admin');
  const audience = participants.filter(p => p.role === 'audience');
  const requesting = audience.filter(p => p.isRequestingToSpeak);

  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    // Simple client-side countdown based on optional scheduledAt in slug (if present later)
    // Placeholder for future enhancement when stages carry scheduled time into room.
    setCountdown(null);
  }, []);

  // Dynamic grid classes based on speaker count
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    return "grid-cols-2 md:grid-cols-3";
  };

  return (
    <div className="h-screen w-full bg-background flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Background glow based on connection */}
      <div className={`absolute top-0 left-0 w-full h-[300px] pointer-events-none transition-colors duration-1000 ${isConnected ? 'bg-gradient-to-b from-primary/10 to-transparent' : 'bg-gradient-to-b from-red-500/10 to-transparent'}`} />

      {/* Main Stage Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
            <h1 className="font-display font-bold text-lg text-white">
              {slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70 ml-2">
              <Users className="w-3 h-3 inline mr-1" /> {viewerCount}
            </span>
          </div>
          {isAdmin && (
            <div className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-sm font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4" /> Admin
            </div>
          )}
        </header>

        {announcements.length > 0 && (
          <div className="px-6 pt-3">
            <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-amber-100">
              <ShieldAlert className="w-5 h-5 mt-0.5 text-amber-400" />
              <div className="flex-1 text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-amber-400 mb-1">
                  Stage announcement
                </p>
                <p className="text-sm leading-relaxed">
                  {announcements[announcements.length - 1].content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto thin-scrollbar">
          <div className={`grid gap-4 h-full max-h-full auto-rows-fr ${getGridClass(speakers.length)}`}>
            <AnimatePresence>
              {speakers.map(speaker => {
                const stream = speaker.id === me?.id ? localStream : remoteStreams[speaker.id];
                return (
                  <VideoPlayer 
                    key={speaker.id}
                    stream={stream || null}
                    displayName={speaker.displayName}
                    isLocal={speaker.id === me?.id}
                  />
                );
              })}
            </AnimatePresence>
            
            {speakers.length === 0 && (
              <div className="col-span-full h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <MicOff className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 font-display">Stage is quiet</h2>
                <p className="text-muted-foreground">Waiting for speakers to join the stage.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="h-20 border-t border-white/5 bg-card/50 backdrop-blur-xl px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {(myRole === 'speaker' || myRole === 'admin') ? (
              <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={toggleMic}
                  className={`w-12 h-12 rounded-full border-white/10 transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/30'}`}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full border-white/10 transition-all ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/30'}`}
                >
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
              </>
            ) : (
              <Button 
                variant="outline"
                className={`h-11 px-6 rounded-full border-white/10 font-semibold transition-all ${me?.isRequestingToSpeak ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                onClick={me?.isRequestingToSpeak ? cancelRequestToSpeak : requestToSpeak}
              >
                <Hand className={`w-5 h-5 mr-2 ${me?.isRequestingToSpeak ? 'fill-current animate-pulse' : ''}`} />
                {me?.isRequestingToSpeak ? "Cancel Request" : "Request to Speak"}
              </Button>
            )}
          </div>
          
          <Button variant="destructive" className="h-11 px-6 rounded-full font-bold shadow-lg shadow-red-500/20" onClick={onLeave}>
            <LogOut className="w-4 h-4 mr-2" /> Leave
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-l border-white/5 bg-card/30 backdrop-blur-md flex flex-col shrink-0 z-20">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col h-full">
          <TabsList className="h-14 bg-transparent border-b border-white/5 rounded-none p-0 w-full justify-start px-2">
            <TabsTrigger value="chat" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-4">
              <MessageSquare className="w-4 h-4 mr-2" /> Chat
            </TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-4">
              <Users className="w-4 h-4 mr-2" /> Audience
              {requesting.length > 0 && isAdmin && (
                <span className="ml-2 w-5 h-5 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
                  {requesting.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 h-0 data-[state=inactive]:hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 text-sm">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                  No messages yet. Say hi!
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="group">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm text-white/90">{msg.senderName}</span>
                      <span className="text-[10px] text-white/30">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed bg-white/5 rounded-2xl rounded-tl-none px-4 py-2 inline-block">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-white/5 bg-background/50 shrink-0">
              <form onSubmit={handleChatSubmit} className="relative">
                <Input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message..."
                  className="bg-black/40 border-white/10 rounded-full pr-12 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                />
                <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1 w-8 h-8 rounded-full text-primary hover:bg-primary/20 hover:text-primary" disabled={!chatInput.trim()}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="audience" className="flex-1 overflow-y-auto mt-0 p-4 thin-scrollbar data-[state=inactive]:hidden">
            <div className="space-y-6">
              
              {/* Requests Section (Admin only) */}
              {isAdmin && requesting.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center">
                    <Hand className="w-3 h-3 mr-1" /> Speaker Requests
                  </h3>
                  <div className="space-y-2">
                    {requesting.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-primary/10 border border-primary/20">
                        <span className="text-sm font-medium text-white">{p.displayName}</span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg" onClick={() => approveSpeaker(p.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Speakers Section */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Speakers ({speakers.length})</h3>
                <div className="space-y-2">
                  {speakers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white/90">{p.displayName} {p.id === me?.id && "(You)"}</span>
                        {p.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      {isAdmin && p.id !== me?.id && (
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeSpeaker(p.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Listeners Section */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Listeners ({audience.length})</h3>
                <div className="space-y-2">
                  {audience.filter(p => !p.isRequestingToSpeak).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white/70">{p.displayName} {p.id === me?.id && "(You)"}</span>
                      </div>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-primary hover:text-primary hover:bg-primary/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => approveSpeaker(p.id)} title="Invite to speak">
                          <Mic className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Announcements Management (Admin only) */}
              {isAdmin && (
                <div className="pt-2 border-t border-white/5">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    Announcements
                  </h3>
                  <form onSubmit={handleAnnouncementSubmit} className="space-y-2">
                    <Input
                      value={announcementInput}
                      onChange={(e) => setAnnouncementInput(e.target.value)}
                      placeholder="Share an announcement with everyone..."
                      className="bg-black/40 border-white/10 text-white text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                      disabled={!announcementInput.trim()}
                    >
                      Send announcement
                    </Button>
                  </form>
                  {announcements.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto thin-scrollbar">
                      {announcements
                        .slice()
                        .reverse()
                        .map((a) => (
                          <div
                            key={a.id}
                            className="text-xs text-white/70 bg-white/5 rounded-lg px-3 py-2"
                          >
                            {a.content}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
