import { useAdmin, useAdminLogin, useAdminLogout } from "@/hooks/use-admin";
import { useStages, useCreateStage, useUpdateStage } from "@/hooks/use-stages";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio, Plus, Power, Activity, LogOut, ArrowRight, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Admin() {
  const { data: auth, isLoading: isAuthLoading } = useAdmin();
  const loginMutation = useAdminLogin();
  const logoutMutation = useAdminLogout();
  const { data: stages, isLoading: isStagesLoading } = useStages();
  const createStageMutation = useCreateStage();
  const updateStageMutation = useUpdateStage();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageTime, setNewStageTime] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(password, {
      onError: (err) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    
    const slug = newStageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    const scheduledAt = newStageTime ? new Date(newStageTime).toISOString() : undefined;

    createStageMutation.mutate({ name: newStageName, slug, scheduledAt }, {
      onSuccess: () => {
        setNewStageName("");
        setNewStageTime("");
        toast({ title: "Stage Created", description: "Your new stage is ready." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isAuthLoading) return null;

  if (!auth?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background pointer-events-none" />
        <div className="glass-card w-full max-w-md p-8 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 border border-primary/30">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-center text-white mb-2 font-display">Admin Access</h2>
          <p className="text-center text-muted-foreground mb-8">Enter your host password to continue</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/40 border-white/10 text-white h-12 text-lg text-center"
            />
            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full h-12 text-lg font-semibold bg-white text-black hover:bg-gray-200 transition-all"
            >
              {loginMutation.isPending ? "Authenticating..." : "Login"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white font-display">Host Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-white/70 hover:text-white">Live Site</Button>
            </Link>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5" onClick={() => logoutMutation.mutate()}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="glass-card rounded-2xl p-6 mb-12 border-primary/20 bg-primary/5">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 font-display">
            <Plus className="w-6 h-6 text-primary" /> Create New Stage
          </h2>
          <form onSubmit={handleCreateStage} className="flex flex-col md:flex-row gap-4">
            <Input 
              placeholder="Stage Name (e.g. Weekly AMA)" 
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className="bg-black/40 border-white/10 text-white h-12 text-lg flex-1"
            />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex-1 md:flex-none">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                  <Clock className="w-3 h-3" />
                  <span>Optional start time</span>
                </div>
                <Input
                  type="datetime-local"
                  value={newStageTime}
                  onChange={(e) => setNewStageTime(e.target.value)}
                  className="bg-black/40 border-white/10 text-white h-10 text-sm"
                />
              </div>
              <Button 
                type="submit" 
                disabled={createStageMutation.isPending || !newStageName.trim()}
                className="h-12 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
              >
                Create
              </Button>
            </div>
          </form>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6 font-display">Your Stages</h2>
        <div className="grid gap-4">
          {isStagesLoading ? (
            <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          ) : stages?.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No stages created yet.</p>
          ) : (
            stages?.map(stage => (
              <div key={stage.id} className={`glass-card rounded-2xl p-6 border ${stage.isActive ? 'border-primary/50 shadow-[0_0_30px_rgba(139,92,246,0.1)]' : 'border-white/5'} flex flex-col md:flex-row items-center justify-between gap-6 transition-all`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stage.isActive ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/50'}`}>
                    {stage.isActive ? <Activity className="w-6 h-6 live-indicator" /> : <Power className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{stage.name}</h3>
                    <p className="text-sm text-muted-foreground">/{stage.slug}</p>
                    {stage.scheduledAt && (
                      <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Scheduled for{" "}
                        {new Date(stage.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    className={`flex-1 md:flex-none h-12 border-white/10 ${stage.isActive ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'}`}
                    onClick={() => updateStageMutation.mutate({ id: stage.id, isActive: !stage.isActive })}
                    disabled={updateStageMutation.isPending}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    {stage.isActive ? "End Stage" : "Go Live"}
                  </Button>
                  
                  {stage.isActive && (
                    <Link href={`/stage/${stage.slug}`}>
                      <Button className="flex-1 md:flex-none h-12 bg-white text-black hover:bg-gray-200">
                        Enter Room <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
