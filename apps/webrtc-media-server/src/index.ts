import express from 'express';
import { Server } from 'ws';
import { RTCPeerConnection, RTCSessionDescription } from 'wrtc';
import { spawn } from 'child_process';
import NodeMediaServer from 'node-media-server';

//gst-launch-1.0 avfvideosrc device-index=0 ! videoconvert ! x264enc ! rtph264pay ! udpsink host=127.0.0.1 port=5000

// Define media server configuration
const config = {
  logType: 3,
  rtmp: {
    port: 1935,
    chunk_size: 4095,
    gop_cache: false,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    allow_origin: '*',
  },
  // Configure UDP for streaming
  relay: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        mode: 'push', // 'push' for outgoing stream
        edge: 'udp://localhost:5000', // This is where GStreamer will send UDP streams
      },
    ],
  },
} as any;

const nms = new NodeMediaServer(config);
nms.run();

// Express app setup
const app = express();
const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

// WebSocket server for signaling
const wss = new Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected to signaling server');

  const peerConnection = new RTCPeerConnection();

  // On ICE candidate event
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ candidate: event.candidate }));
    }
  };

  // When connection is established, we capture and send video stream
  const gst = spawn('gst-launch-1.0', [
    'avfvideosrc',
    'device-index=0',
    '!',
    'videoconvert',
    '!',
    'x264enc',
    '!',
    'rtph264pay',
    '!',
    'udpsink',
    'host=127.0.0.1',
    'port=5000',
  ]);

  gst.stdout.on('data', (data) => {
    console.log(`GStreamer stdout: ${data}`);
  });

  gst.stderr.on('data', (data) => {
    console.error(`GStreamer stderr: ${data}`);
  });

  gst.on('close', (code) => {
    console.log(`GStreamer process exited with code ${code}`);
  });

  // Handle signaling messages
  ws.on('message', async (message) => {
    const data = JSON.parse(message as unknown as string) as any;
    console.log(data);

    if (data.offer) {
      await peerConnection.setRemoteDescription(
        //@ts-ignore
        new RTCSessionDescription({
          type: data.offer.type,
          sdp: data.offer.sdp,
        })
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      ws.send(JSON.stringify({ answer }));
    }

    if (data.candidate) {
      await peerConnection.addIceCandidate(data.candidate as any);
    }
  });

  ws.on('close', () => {
    gst.kill('SIGINT');
  });
});
