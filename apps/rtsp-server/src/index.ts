import express from 'express';
import { spawn } from 'child_process';

const app = express();
const port = 3000;

// Endpoint to start the RTSP stream
app.get('/start-stream', (req, res) => {
  const ffmpeg = spawn('ffmpeg', [
    '-f',
    'avfoundation', // AVFoundation for macOS
    '-framerate',
    '30', // Set framerate
    '-i',
    '0', // Use webcam as input (index 0)
    '-f',
    'rtsp', // Output format RTSP
    'rtsp://localhost:8554/live.sdp', // RTSP output URL
  ]);

  // Log FFmpeg output to console
  ffmpeg.stdout.on('data', (data) => {
    console.log(`FFmpeg Output: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg Error: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process closed with code ${code}`);
  });

  res.send('RTSP stream started!');
});

// Endpoint to stop the RTSP stream
app.get('/stop-stream', (req, res) => {
  // You would need logic here to stop the FFmpeg process
  res.send('RTSP stream stopped!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
