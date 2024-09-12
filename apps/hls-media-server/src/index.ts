import { exec } from 'child_process';
import NodeMediaServer from 'node-media-server';

/**
 * Based on the following documentation
 * https://medium.com/@rewal34/build-a-live-streaming-server-using-rtmp-and-hls-with-node-media-server-on-docker-089c8487ccd7
 *
 * gst-launch-1.0 -v avfvideosrc device-index=0 ! videoconvert ! x264enc ! flvmux ! rtmpsink location=${RTMP_URL}
 * gst-launch-1.0 -v avfvideosrc device-index=0 ! videoconvert ! x264enc ! tee name=t ! queue ! flvmux ! rtmpsink location=${rtmpUrl} t. ! queue ! hlssink location=${HLS_DIR}/segment_%05d.ts playlist-location=${HLS_DIR}/stream.m3u8
 * ffmpeg -re -f avfoundation -framerate 30 -pixel_format uyvy422 -i "0" -f flv ${RTMP_URL}
 */

// RTMP URL (Replace with your RTMP stream URL)
const RTMP_URL = 'rtmp://localhost:1935/live/webcam';

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 100, // Try smaller sizes for lower latency
    gop_cache: false,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media',
  },
  trans: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: false,
      },
    ],
  },
};

const startGstreamer = () => {
  // Start GStreamer pipeline for IP camera stream
  exec(
    `gst-launch-1.0 -v avfvideosrc device-index=0 ! videoconvert ! x264enc ! flvmux ! rtmpsink location=${RTMP_URL}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Stdout: ${stdout}`);
    }
  );
};

startGstreamer();

const nms = new NodeMediaServer(config as any);
nms.run();
