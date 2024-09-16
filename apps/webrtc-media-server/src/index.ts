import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
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
  let producerTransport:
    | mediasoup.types.WebRtcTransport<mediasoup.types.WebRtcTransportData>
    | undefined;
  let consumerTransport:
    | mediasoup.types.WebRtcTransport<mediasoup.types.WebRtcTransportData>
    | undefined;
  let producer: mediasoup.types.Producer<mediasoup.types.AppData> | undefined;
  let consumer: mediasoup.types.Consumer<mediasoup.types.AppData> | undefined;

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

  const createWebRtcTransport = async (socket: Socket) => {
    try {
      const webRtcTransport_options: mediasoup.types.WebRtcTransportOptions<mediasoup.types.WebRtcTransportData> =
        {
          listenIps: [{ ip: '127.0.0.1' }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        };

      let transport = await router.createWebRtcTransport(
        webRtcTransport_options
      );

      console.log(`transport id: ${transport.id}`);
      transport.on('dtlsstatechange', (dtlsstate) => {
        if (dtlsstate === 'closed') {
          transport.close();
        }
      });

      transport.on('@close', () => {
        console.log('Transport closed');
      });

      socket.emit('createWebRtcTransport', {
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });

      return transport;
    } catch (error) {
      socket.emit('createWebRtcTransport', { params: { error } });
    }
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

    socket.on('getRtpCapabilities', () => {
      const rtpCapabilities = router.rtpCapabilities;
      console.log('rtp capabilities', rtpCapabilities);
      socket.emit('getRtpCapabilities', { rtpCapabilities });
    });

    socket.on('createWebRtcTransport', async ({ sender }) => {
      if (sender) {
        producerTransport = await createWebRtcTransport(socket);
      } else {
        consumerTransport = await createWebRtcTransport(socket);
      }
    });

    socket.on('transport-connect', async ({ dtlsParameters }) => {
      console.log('DTLS PARAMS', { dtlsParameters });
      await producerTransport?.connect({ dtlsParameters });
    });

    socket.on('transport-produce', async ({ kind, rtpParameters }) => {
      producer = await producerTransport?.produce({
        kind,
        rtpParameters,
      });

      producer?.on('transportclose', () => {
        console.log('Transport for this producer closed');
        producer?.close();
      });

      socket.emit('transport-produce', { id: producer?.id });
    });

    socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
      console.log('DTLS PARAMS', { dtlsParameters });
      await consumerTransport?.connect({ dtlsParameters });
    });

    socket.on('consume', async ({ rtpCapabilities }) => {
      try {
        if (producer?.id === undefined) {
          throw new Error('Producer is undefined');
        }
        if (router.canConsume({ producerId: producer?.id, rtpCapabilities })) {
          consumer = await consumerTransport?.consume({
            producerId: producer?.id,
            rtpCapabilities,
            paused: true,
          });
        }

        consumer?.on('transportclose', () => {
          console.log('transport close from consumer');
        });

        consumer?.on('producerclose', () => {
          console.log('producer of consumer closed');
        });

        const params = {
          id: consumer?.id,
          producerId: producer?.id,
          kind: consumer?.kind,
          rtpParameters: consumer?.rtpParameters,
        };

        socket.emit('consume', { params });
      } catch (error) {
        if (error instanceof Error) {
          socket.emit('consume', { params: { error } });
        }
      }
    });

    socket.on('consumer-resume', async () => {
      console.log('consumer resume');
      await consumer?.resume();
    });
  });

  server.listen(PORT, () => {
    console.log('Application running on port ' + PORT);
  });
};

main();
