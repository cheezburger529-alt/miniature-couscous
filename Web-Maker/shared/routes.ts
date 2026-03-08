import { z } from 'zod';
import { insertStageSchema, stages } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() })
};

export const api = {
  admin: {
    login: {
      method: 'POST' as const,
      path: '/api/admin/login' as const,
      input: z.object({ password: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    },
    verify: {
      method: 'GET' as const,
      path: '/api/admin/verify' as const,
      responses: {
        200: z.object({ isAuthenticated: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/admin/logout' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
  },
  stages: {
    list: {
      method: 'GET' as const,
      path: '/api/stages' as const,
      responses: {
        200: z.array(z.custom<typeof stages.$inferSelect>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/stages/:slug' as const,
      responses: {
        200: z.custom<typeof stages.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/stages' as const,
      input: insertStageSchema,
      responses: {
        201: z.custom<typeof stages.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/stages/:id' as const,
      input: insertStageSchema.partial(),
      responses: {
        200: z.custom<typeof stages.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export const ws = {
  send: {
    joinStage: z.object({ stageSlug: z.string(), displayName: z.string(), isAdmin: z.boolean().optional() }),
    leaveStage: z.object({ stageSlug: z.string() }),
    sendMessage: z.object({ stageSlug: z.string(), content: z.string() }),
    requestToSpeak: z.object({ stageSlug: z.string() }),
    cancelRequestToSpeak: z.object({ stageSlug: z.string() }),
    // Admin only
    approveSpeaker: z.object({ stageSlug: z.string(), participantId: z.string() }),
    removeSpeaker: z.object({ stageSlug: z.string(), participantId: z.string() }),
    // WebRTC Signaling
    signal: z.object({ stageSlug: z.string(), targetId: z.string(), signal: z.any() })
  },
  receive: {
    stageState: z.object({
      stageSlug: z.string(),
      participants: z.array(z.object({
        id: z.string(),
        displayName: z.string(),
        role: z.enum(['admin', 'speaker', 'audience']),
        isRequestingToSpeak: z.boolean()
      })),
      viewerCount: z.number()
    }),
    message: z.object({
      id: z.string(),
      senderId: z.string(),
      senderName: z.string(),
      content: z.string(),
      timestamp: z.string()
    }),
    participantJoined: z.object({
      participant: z.object({ id: z.string(), displayName: z.string(), role: z.enum(['admin', 'speaker', 'audience']), isRequestingToSpeak: z.boolean() }),
      viewerCount: z.number()
    }),
    participantLeft: z.object({
      participantId: z.string(),
      viewerCount: z.number()
    }),
    participantUpdated: z.object({
      participant: z.object({ id: z.string(), displayName: z.string(), role: z.enum(['admin', 'speaker', 'audience']), isRequestingToSpeak: z.boolean() })
    }),
    signal: z.object({
      senderId: z.string(),
      signal: z.any()
    })
  }
};

export type StageResponse = z.infer<typeof api.stages.create.responses[201]>;
