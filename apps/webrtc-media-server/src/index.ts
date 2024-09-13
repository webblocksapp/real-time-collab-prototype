import express, { Request, Response } from 'express';
import http from 'http';
import net from 'net';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import 'log-timestamp';

const app = express();
app.use(express.static(__dirname + '/'));

const httpServer = http.createServer(app);
const port = 9001; // change port number if required

let gstMuxer: ChildProcessWithoutNullStreams | undefined;

// send the HTML page that holds the video tag
app.get('/', (req: Request, res: Response) => {
  res.sendFile(__dirname + '/index.html');
});

// stop the connection
app.post('/stop', (req: Request, res: Response) => {
  console.log('Connection closed using /stop endpoint.');

  if (gstMuxer) {
    gstMuxer.kill(); // killing GStreamer Pipeline
    console.log('After gstMuxer kill in connection');
  }
  gstMuxer = undefined;
  res.end();
});

// send the video stream
app.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'video/webm',
  });

  const tcpServer = net.createServer((socket) => {
    socket.on('data', (data) => {
      console.log(data);
      res.write(data);
    });

    socket.on('close', (hadError) => {
      console.log('Socket closed.');
      res.end();
    });
  });

  tcpServer.maxConnections = 1;

  tcpServer.listen(() => {
    console.log('Connection started.');

    if (!gstMuxer) {
      console.log('inside gstMuxer == undefined');
      const cmd = 'gst-launch-1.0';
      const args = getGstPipelineArguments(tcpServer);
      console.log(`${cmd} ${args.join(' ')}`);
      gstMuxer = spawn(cmd, args);

      gstMuxer.stderr.on('data', onSpawnError);
      gstMuxer.on('exit', onSpawnExit);
    } else {
      console.log('New GST pipeline rejected because gstMuxer != undefined.');
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Camera Stream App listening at http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
  console.log(err);
});

// functions
function onSpawnError(data: any) {
  console.log(data.toString());
}

function onSpawnExit(code: number | null) {
  if (code !== null) {
    console.log(`GStreamer error, exit code ${code}`);
  }
}

function getGstPipelineArguments(tcpServer: net.Server): string[] {
  // Replace 'videotestsrc', 'pattern=ball' with camera source in below GStreamer pipeline arguments.
  const args: string[] = [
    'avfvideosrc',
    'device-index=0',
    '!',
    'video/x-raw,width=1920,height=1080',
    '!',
    'x264enc',
    'bitrate=2000',
    '!',
    'mp4mux',
    'fragment-duration=10',
    '!',
    'tcpclientsink',
    'host=localhost',
    //@ts-ignore
    'port=' + tcpServer.address()?.port,
  ];
  return args;
}
