import { useStages } from "@/hooks/use-stages";
import { Link } from "wouter";
import { Radio, Users, Play, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupProfileDialog, useProfileStore } from "@/components/SetupProfileDialog";
import { useState } from "react";

export default function Home() {
  const { data: stages, isLoading } = useStages();
  const displayName = useProfileStore(s => s.displayName);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const activeStages = stages?.filter(s => s.isActive) || [];

  const handleJoinClick = (slug: string, e: React.MouseEvent) => {
    if (!displayName) {
      e.preventDefault();
      setSelectedStage(slug);
      setProfileDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      <header className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">StageHost</h1>
        </div>
        <Link href="/admin" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
          Admin Login
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white/80">Real-time Audio & Video Stages</span>
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/50 mb-6">
          Where Conversations <br/> Come Alive
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Join live stages instantly. Listen in, request to speak, and connect with the community in real-time. No signup required.
        </p>

        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Live Stages
            </h3>
            <span className="text-sm text-white/50 font-medium">{activeStages.length} Active</span>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/5" />
              ))
            ) : activeStages.length > 0 ? (
              activeStages.map(stage => (
                <div key={stage.id} className="glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Radio className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{stage.name}</h4>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> 
                        <span>Hosted by Admin</span>
                      </p>
                    </div>
                  </div>
                  <Link href={displayName ? `/stage/${stage.slug}` : "#"} onClick={(e) => handleJoinClick(stage.slug, e)} className="w-full md:w-auto shrink-0">
                    <Button className="w-full md:w-auto px-8 py-6 rounded-xl text-lg font-semibold bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      <Play className="w-5 h-5 mr-2 fill-current" />
                      Join Stage
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center border-dashed border-white/10">
                <Radio className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-white mb-2">No active stages</h4>
                <p className="text-muted-foreground">Check back later when a host goes live.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <SetupProfileDialog 
        open={profileDialogOpen} 
        onOpenChange={(open) => {
          setProfileDialogOpen(open);
          if (!open && displayName && selectedStage) {
            window.location.href = `/stage/${selectedStage}`;
          }
        }} 
      />
    </div>
  );
}
