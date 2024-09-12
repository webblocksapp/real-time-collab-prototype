import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = ['http://localhost:5173'];
const server = createServer(app);

const io = new Server(server, {
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

app.get('/', (_: Request, res: Response) => {
  res.send('Server is running');
});

io.on('connection', (socket: Socket) => {
  console.log('New user connected:', socket.id);

  // Listen the cursor position sent by the ui.
  socket.on('cursorPosition', (position) => {
    // Send the position to all the clients except who sent.
    socket.broadcast.emit('updateCursorPosition', {
      id: socket.id,
      ...position,
    });
  });

  // Handle user disconnection.
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    socket.broadcast.emit('userDisconnected', socket.id);
  });

  // Handle disconnect.
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening port ${PORT}`);
});
