import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { Http2Server } from 'http2';

const app = express();
const PORT = 3000;
const ALLOWED_ORIGINS = ['http://localhost:5173'];

const server = http.createServer(app);
const io = new Server(server as unknown as Http2Server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

const peers = io.of('/mediasoup');

peers.on('connection', (socket) => {
  console.log(socket.id);
  socket.emit('connection-success', { socketId: socket.id });
});

server.listen(PORT, () => {
  console.log('Application running on port ' + PORT);
});
