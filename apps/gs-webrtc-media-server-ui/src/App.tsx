import { useEffect, useMemo, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

function App() {
  const socket = useMemo(() => io('http://localhost:3000/mediasoup'), []);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const ref = useRef<{
    device?: mediasoupClient.types.Device;
    rtpCapabilities?: mediasoupClient.types.RtpCapabilities;
    producerTransport?: mediasoupClient.types.Transport<mediasoupClient.types.AppData>;
    consumerTransport?: mediasoupClient.types.Transport<mediasoupClient.types.AppData>;
    producer?: mediasoupClient.types.Producer<mediasoupClient.types.AppData>;
    consumer?: mediasoupClient.types.Consumer<mediasoupClient.types.AppData>;
  }>({});

  const getRtpCapabilities = () => {
    socket.emit('getRtpCapabilities');
    socket.on(
      'getRtpCapabilities',
      (data: { rtpCapabilities: mediasoupClient.types.RtpCapabilities }) => {
        console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
        ref.current.rtpCapabilities = data.rtpCapabilities;
      }
    );
  };

  const createDevice = async () => {
    try {
      ref.current.device = new mediasoupClient.Device();

      if (ref.current.rtpCapabilities === undefined) {
        throw new Error('Please get Rtp capabilities first');
      }

      await ref.current.device.load({
        routerRtpCapabilities: ref.current.rtpCapabilities,
      });

      console.log('RTP capabilities', ref.current.device.rtpCapabilities);
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.name === 'UnsupportedError') {
        console.warn('Browser not supported');
      }
    }
  };

  const createTransport = () => {
    socket.emit('createTransport', { sender: true });
  };

  const createRecvTransport = async () => {
    socket.emit('createTransport', { sender: false });
    socket.on('createTransport', ({ params }) => {
      if (params.error) {
        console.log(params.error);
        return;
      }

      console.log(params);

      ref.current.consumerTransport =
        ref.current.device?.createRecvTransport(params);

      ref.current.consumerTransport?.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit('transport-recv-connect', {
              dtlsParameters,
            });

            callback();
          } catch (error) {
            if (error instanceof Error) errback(error);
          }
        }
      );
    });
  };

  const connectRecvTransport = async () => {
    socket.emit('consume', {
      rtpCapabilities: ref.current.rtpCapabilities,
    });
    socket.on('consume', async ({ params }) => {
      if (params.error) {
        console.log('Cannot consume');
      }

      console.log(params);
      ref.current.consumer = await ref.current.consumerTransport?.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      });

      if (ref.current.consumer === undefined) {
        console.error('Consumer is not defined');
        return;
      }

      const { track } = ref.current.consumer;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = new MediaStream([track]);
        socket.emit('consumer-resume');
      }
    });
  };

  useEffect(() => {
    socket.on('connection-success', ({ socketId }) => {
      console.log(socketId);
    });
  }, []);

  return (
    <div>
      <div id="video">
        <table>
          <thead>
            <tr>
              <th>Remote Video</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div id="sharedBtns">
                  <video
                    ref={remoteVideoRef}
                    id="remoteVideo"
                    autoPlay
                    className="video"
                  ></video>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <div id="sharedBtns">
                  <button onClick={getRtpCapabilities}>
                    1. Get Rtp Capabilities
                  </button>
                  <br />
                  <button onClick={createDevice}>2. Create Device</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div id="sharedBtns">
                  <button onClick={createTransport}>
                    3. Create Send Transport
                  </button>
                  <button onClick={createRecvTransport}>
                    4. Create Recv Transport
                  </button>
                  <br />
                  <button onClick={connectRecvTransport}>
                    5. Connect Recv Transport & Consume
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
