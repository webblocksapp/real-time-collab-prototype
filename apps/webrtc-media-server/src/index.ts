import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { Http2Server } from 'http2';
import * as mediasoup from 'mediasoup';

const main = async () => {
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

  let worker: mediasoup.types.Worker<mediasoup.types.AppData>;
  let router: mediasoup.types.Router<mediasoup.types.AppData>;

  const createWorker = async () => {
    worker = await mediasoup.createWorker({
      rtcMinPort: 2000,
      rtcMaxPort: 2020,
    });
    console.log(`worker pid ${worker.pid}`);
    worker.on('died', () => {
      console.error('mediasoup worker has died');
      setTimeout(() => process.exit(1), 2000);
    });
    return worker;
  };

  worker = await createWorker();

  const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
  ];

  peers.on('connection', async (socket) => {
    console.log(socket.id);

    socket.emit('connection-success', { socketId: socket.id });
    socket.on('disconnect', () => {
      console.log('peer disconnected');
    });

    router = await worker.createRouter({ mediaCodecs });

    socket.on('getRtpCapabilities', (callback) => {
      const rtpCapabilities = router.rtpCapabilities;
      console.log('rtp capabilities', rtpCapabilities);

      callback({ rtpCapabilities });
    });
  });

  server.listen(PORT, () => {
    console.log('Application running on port ' + PORT);
  });
};

main();
