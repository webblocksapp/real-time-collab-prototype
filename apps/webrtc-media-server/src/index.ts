import express, { Request, Response } from 'express';
import http from 'http';

const app = express();
app.use(express.static(__dirname + '/'));
const PORT = 3000;

const server = http.createServer(app);

app.get('/', (_: Request, res: Response) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(PORT, () => {
  console.log('Application running on port ' + PORT);
});
