import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export type RealtimeServer = NetServer & {
  io?: SocketIOServer;
};

export function attachSocketServer(server: RealtimeServer) {
  if (server.io) return server.io;
  server.io = new SocketIOServer(server, {
    path: "/api/socket",
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" }
  });

  server.io.on("connection", (socket) => {
    socket.on("join-course", (courseId: string) => socket.join(`course:${courseId}`));
    socket.on("doubt-created", (payload) => socket.broadcast.emit("doubt-created", payload));
    socket.on("progress-posted", (payload) => socket.broadcast.emit("progress-posted", payload));
  });

  return server.io;
}
