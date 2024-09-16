import { useEffect, useMemo, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

let params: mediasoupClient.types.ProducerOptions<mediasoupClient.types.AppData> =
  {
    encodings: [
      { rid: 'r0', maxBitrate: 100000, scalabilityMode: 'S1T3' },
      { rid: 'r1', maxBitrate: 300000, scalabilityMode: 'S1T3' },
      { rid: 'r2', maxBitrate: 900000, scalabilityMode: 'S1T3' },
    ],
    codecOptions: {
      videoGoogleStartBitrate: 1000,
    },
  };

function App() {
  const socket = useMemo(() => io('http://localhost:3000/mediasoup'), []);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const ref = useRef<{
    device?: mediasoupClient.types.Device;
    rtpCapabilities?: mediasoupClient.types.RtpCapabilities;
    producerTransport?: mediasoupClient.types.Transport<mediasoupClient.types.AppData>;
    consumerTransport?: mediasoupClient.types.Transport<mediasoupClient.types.AppData>;
    producer?: mediasoupClient.types.Producer<mediasoupClient.types.AppData>;
    consumer?: mediasoupClient.types.Consumer<mediasoupClient.types.AppData>;
  }>({});

  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: {
            min: 640,
            max: 1920,
          },
          height: {
            min: 480,
            max: 1080,
          },
        },
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        params = { ...params, track };
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
    }
  };

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

  const createSendTransport = () => {
    socket.emit('createWebRtcTransport', { sender: true });
    socket.on('createWebRtcTransport', ({ params }) => {
      if (params.error) {
        console.log(params.error);
      }

      console.log(params);

      if (ref.current.device === undefined) {
        console.error('No device found');
        return;
      }

      ref.current.producerTransport =
        ref.current.device.createSendTransport(params);

      ref.current.producerTransport.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit('transport-connect', {
              transportId: ref.current.producerTransport?.id,
              dtlsParameters,
            });

            callback();
          } catch (error) {
            if (error instanceof Error) errback(error);
          }
        }
      );

      ref.current.producerTransport.on(
        'produce',
        async (parameters, callback, errback) => {
          console.log(parameters);

          try {
            socket.emit(
              'transport-produce',
              {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
              },
              ({ id }: { id: string }) => {
                callback({ id });
              }
            );
          } catch (error) {
            if (error instanceof Error) errback(error);
          }
        }
      );
    });
  };

  const connectSendTransport = async () => {
    ref.current.producer = await ref.current.producerTransport?.produce(params);
    ref.current.producer?.on?.('trackended', () => {
      console.log('Track ended');
    });

    ref.current.producer?.on?.('transportclose', () => {
      console.log('Transport ended');
    });
  };

  const createRecvTransport = async () => {
    socket.emit('createWebRtcTransport', { sender: false });
    socket.on('createWebRtcTransport', ({ params }) => {
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
              <th>Local Video</th>
              <th>Remote Video</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div id="sharedBtns">
                  <video
                    ref={localVideoRef}
                    id="localVideo"
                    autoPlay
                    className="video"
                  ></video>
                </div>
              </td>
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
              <td>
                <div id="sharedBtns">
                  <button onClick={getLocalStream}>1. Get Local Video</button>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <div id="sharedBtns">
                  <button onClick={getRtpCapabilities}>
                    2. Get Rtp Capabilities
                  </button>
                  <br />
                  <button onClick={createDevice}>3. Create Device</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div id="sharedBtns">
                  <button onClick={createSendTransport}>
                    4. Create Send Transport
                  </button>
                  <br />
                  <button onClick={connectSendTransport}>
                    5. Connect Send Transport & Produce
                  </button>
                </div>
              </td>
              <td>
                <div id="sharedBtns">
                  <button onClick={createRecvTransport}>
                    6. Create Recv Transport
                  </button>
                  <br />
                  <button onClick={connectRecvTransport}>
                    7. Connect Recv Transport & Consume
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
