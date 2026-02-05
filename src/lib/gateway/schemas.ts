import { z } from 'zod';

// Base frame types
export const RpcResultFrameSchema = z.object({
  id: z.string(),
  type: z.literal('rpc_result'),
  result: z.unknown()
});

export const RpcErrorFrameSchema = z.object({
  id: z.string(),
  type: z.literal('rpc_error'),
  error: z.object({
    message: z.string().optional(),
    code: z.string().optional(),
    data: z.unknown().optional()
  })
});

export const PongFrameSchema = z.object({
  type: z.literal('pong'),
  ts: z.number().optional()
});

export const EventFrameSchema = z.object({
  type: z.literal('event'),
  event: z.string(),
  data: z.record(z.string(), z.unknown()).optional()
});

// Base frame with type field for initial validation
export const BaseFrameSchema = z.object({
  type: z.string()
}).passthrough();

// Validate frame based on type
export const validateFrame = (data: unknown) => {
  const base = BaseFrameSchema.safeParse(data);
  if (!base.success) return null;
  
  switch (base.data.type) {
    case 'rpc_result':
      return RpcResultFrameSchema.safeParse(data);
    case 'rpc_error':
      return RpcErrorFrameSchema.safeParse(data);
    case 'pong':
      return PongFrameSchema.safeParse(data);
    case 'event':
      return EventFrameSchema.safeParse(data);
    default:
      return null;
  }
};

// For backwards compatibility
export const InboundFrameSchema = BaseFrameSchema;

// Agent status
export const AgentStatusSchema = z.enum(['idle', 'running', 'error', 'disconnected']);

// Presence event data
export const PresenceAgentSchema = z.object({
  id: z.string().optional(),
  agentId: z.string().optional(),
  name: z.string().optional(),
  agentName: z.string().optional(),
  status: AgentStatusSchema.optional()
}).passthrough();

export const PresenceEventDataSchema = z.object({
  agentId: z.string().optional(),
  id: z.string().optional(),
  status: AgentStatusSchema.optional(),
  agentName: z.string().optional(),
  agents: z.array(PresenceAgentSchema).optional()
}).passthrough();

// Heartbeat event data
export const HeartbeatEventDataSchema = z.object({
  ts: z.number().optional(),
  agentId: z.string().optional(),
  id: z.string().optional(),
  status: AgentStatusSchema.optional()
}).passthrough();

// Chat event data
export const ChatEventDataSchema = z.object({
  id: z.string().optional(),
  ts: z.number().optional(),
  agentId: z.string().optional(),
  sessionKey: z.string().optional(),
  role: z.enum(['user', 'agent', 'system']).optional(),
  text: z.string().optional(),
  message: z.unknown().optional(),
  messages: z.array(z.unknown()).optional(),
  chunk: z.string().optional(),
  delta: z.string().optional()
}).passthrough();

// Agent event data
export const AgentEventDataSchema = z.object({
  agentId: z.string().optional(),
  id: z.string().optional(),
  event: z.string().optional(),
  status: AgentStatusSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional()
}).passthrough();

// Agents list response
export const AgentsListItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  status: AgentStatusSchema.optional(),
  sessionKey: z.string().optional(),
  session_key: z.string().optional(),
  model: z.string().optional(),
  thinking: z.enum(['low', 'medium', 'high']).optional()
}).passthrough();

export const AgentsListResultSchema = z.object({
  agents: z.array(AgentsListItemSchema).optional(),
  items: z.array(AgentsListItemSchema).optional()
}).passthrough();

// Type exports
export type ValidatedRpcResult = z.infer<typeof RpcResultFrameSchema>;
export type ValidatedRpcError = z.infer<typeof RpcErrorFrameSchema>;
export type ValidatedEventFrame = z.infer<typeof EventFrameSchema>;
export type ValidatedInboundFrame = z.infer<typeof InboundFrameSchema>;
