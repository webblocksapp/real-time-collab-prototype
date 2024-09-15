import express, { Request, Response } from 'express';
import * as https from '@httptoolkit/httpolyglot';
import fs from 'fs';
import { ServerOptions } from 'https';
import { Server } from 'socket.io';
import { Http2Server } from 'http2';

const app = express();
const PORT = 3000;

const options: ServerOptions = {
  key: fs.readFileSync(__dirname + '/ssl/key.pem', 'utf-8'),
  cert: fs.readFileSync(__dirname + '/ssl/cert.pem', 'utf-8'),
};
const server = https.createServer(options, app);
const io = new Server(server as unknown as Http2Server);

const peers = io.of('/mediasoup');

peers.on('connection', (socket) => {
  console.log(socket.id);
  socket.emit('connection-success', { socketId: socket.id });
});

server.listen(PORT, () => {
  console.log('Application running on port ' + PORT);
});
