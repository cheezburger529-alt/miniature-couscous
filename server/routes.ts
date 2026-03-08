import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  const stageRooms = new Map<string, {
    participants: { id: string, displayName: string, role: 'admin'|'speaker'|'audience', isRequestingToSpeak: boolean, socketId: string }[],
    announcements: { id: string, content: string, timestamp: string }[],
  }>();

  io.on('connection', (socket) => {
    socket.on('joinStage', (data) => {
      const { stageSlug, displayName, isAdmin } = data;
      socket.join(stageSlug);
      
      let room = stageRooms.get(stageSlug);
      if (!room) {
        room = { participants: [], announcements: [] };
        stageRooms.set(stageSlug, room);
      }
      
      const role = isAdmin ? 'admin' : 'audience';
      const participant = { id: crypto.randomUUID(), displayName, role, isRequestingToSpeak: false, socketId: socket.id };
      room.participants.push(participant);

      // notify others
      socket.to(stageSlug).emit('participantJoined', {
        participant: { id: participant.id, displayName, role, isRequestingToSpeak: false },
        viewerCount: room.participants.length
      });

      // send state to the new user
      socket.emit('stageState', {
        stageSlug,
        participants: room.participants.map(p => ({
          id: p.id, displayName: p.displayName, role: p.role, isRequestingToSpeak: p.isRequestingToSpeak
        })),
        viewerCount: room.participants.length,
        announcements: room.announcements,
      });

      socket.data.stageSlug = stageSlug;
      socket.data.participantId = participant.id;
    });

    socket.on('leaveStage', () => {
      handleDisconnect(socket);
    });

    socket.on('sendMessage', (data) => {
      const { stageSlug, content } = data;
      const room = stageRooms.get(stageSlug);
      if (room) {
        const participant = room.participants.find(p => p.socketId === socket.id);
        if (participant) {
          io.to(stageSlug).emit('message', {
            id: crypto.randomUUID(),
            senderId: participant.id,
            senderName: participant.displayName,
            content,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    socket.on('sendAnnouncement', (data) => {
      const { stageSlug, content } = data;
      const room = stageRooms.get(stageSlug);
      if (room) {
        const participant = room.participants.find(p => p.socketId === socket.id);
        if (participant && participant.role === 'admin') {
          const announcement = {
            id: crypto.randomUUID(),
            content,
            timestamp: new Date().toISOString(),
          };
          room.announcements.push(announcement);
          io.to(stageSlug).emit('announcement', announcement);
        }
      }
    });

    socket.on('requestToSpeak', (data) => {
      updateParticipant(socket, data.stageSlug, { isRequestingToSpeak: true });
    });

    socket.on('cancelRequestToSpeak', (data) => {
      updateParticipant(socket, data.stageSlug, { isRequestingToSpeak: false });
    });

    // Admin actions
    socket.on('approveSpeaker', (data) => {
      const { stageSlug, participantId } = data;
      const room = stageRooms.get(stageSlug);
      if (room) {
        const participant = room.participants.find(p => p.id === participantId);
        if (participant) {
          participant.role = 'speaker';
          participant.isRequestingToSpeak = false;
          io.to(stageSlug).emit('participantUpdated', {
            participant: { id: participant.id, displayName: participant.displayName, role: participant.role, isRequestingToSpeak: participant.isRequestingToSpeak }
          });
        }
      }
    });

    socket.on('removeSpeaker', (data) => {
      const { stageSlug, participantId } = data;
      const room = stageRooms.get(stageSlug);
      if (room) {
        const participant = room.participants.find(p => p.id === participantId);
        if (participant) {
          participant.role = 'audience';
          io.to(stageSlug).emit('participantUpdated', {
            participant: { id: participant.id, displayName: participant.displayName, role: participant.role, isRequestingToSpeak: participant.isRequestingToSpeak }
          });
        }
      }
    });

    // WebRTC Signaling
    socket.on('signal', (data) => {
      const { stageSlug, targetId, signal } = data;
      const room = stageRooms.get(stageSlug);
      if (room) {
        const sender = room.participants.find(p => p.socketId === socket.id);
        const target = room.participants.find(p => p.id === targetId);
        if (sender && target) {
          io.to(target.socketId).emit('signal', {
            senderId: sender.id,
            signal
          });
        }
      }
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  function updateParticipant(socket: any, stageSlug: string, updates: any) {
    const room = stageRooms.get(stageSlug);
    if (room) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        Object.assign(participant, updates);
        io.to(stageSlug).emit('participantUpdated', {
          participant: { id: participant.id, displayName: participant.displayName, role: participant.role, isRequestingToSpeak: participant.isRequestingToSpeak }
        });
      }
    }
  }

  function handleDisconnect(socket: any) {
    const { stageSlug, participantId } = socket.data;
    if (stageSlug && participantId) {
      const room = stageRooms.get(stageSlug);
      if (room) {
        room.participants = room.participants.filter(p => p.id !== participantId);
        io.to(stageSlug).emit('participantLeft', {
          participantId,
          viewerCount: room.participants.length
        });
        if (room.participants.length === 0) {
          stageRooms.delete(stageSlug);
        }
      }
    }
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GG_/(())_ROCKSTAR';

  app.post(api.admin.login.path, (req, res) => {
    try {
      const { password } = api.admin.login.input.parse(req.body);
      if (password === ADMIN_PASSWORD) {
        (req.session as any).isAdmin = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (e) {
      res.status(401).json({ message: "Invalid request" });
    }
  });

  app.get(api.admin.verify.path, (req, res) => {
    const isAdmin = !!(req.session as any).isAdmin;
    res.json({ isAuthenticated: isAdmin });
  });

  app.post(api.admin.logout.path, (req, res) => {
    (req.session as any).isAdmin = false;
    res.json({ success: true });
  });

  app.get(api.stages.list.path, async (req, res) => {
    const stages = await storage.getStages();
    res.json(stages);
  });

  app.post(api.stages.create.path, async (req, res) => {
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = api.stages.create.input.parse(req.body);
      const stage = await storage.createStage(input);
      res.status(201).json(stage);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.stages.get.path, async (req, res) => {
    const stage = await storage.getStageBySlug(req.params.slug);
    if (!stage) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(stage);
  });

  return httpServer;
}
