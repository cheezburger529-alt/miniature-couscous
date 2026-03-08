## Packages
socket.io-client | Real-time signaling, chat, and stage state management
simple-peer | WebRTC peer connections for the video/audio streams
@types/simple-peer | TypeScript definitions for simple-peer
framer-motion | Smooth animations for the video grid and UI transitions
zustand | Lightweight global state for user settings (display name, etc.)

## Notes
- Wouter handles routing.
- simple-peer may require global window polyfills in Vite, but we will use it directly as requested.
- Socket.IO connects to the default path `/`.
- WebRTC uses stun servers (Google STUN) for NAT traversal.
- The Admin dashboard requires password login which stores an HTTP-only cookie.
