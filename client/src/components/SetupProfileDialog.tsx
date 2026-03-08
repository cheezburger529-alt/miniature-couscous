import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { create } from "zustand";

interface ProfileStore {
  displayName: string | null;
  setDisplayName: (name: string) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  displayName: localStorage.getItem('stageHost_displayName'),
  setDisplayName: (name) => {
    localStorage.setItem('stageHost_displayName', name);
    set({ displayName: name });
  },
}));

export function SetupProfileDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const setDisplayName = useProfileStore(s => s.setDisplayName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setDisplayName(name.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-display text-white">Join the Stage</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter a display name so others know who you are.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Alex, Curious Listener..."
            className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 text-lg focus-visible:ring-primary/50"
            autoFocus
          />
          <Button type="submit" disabled={!name.trim()} className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all">
            Enter Room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
