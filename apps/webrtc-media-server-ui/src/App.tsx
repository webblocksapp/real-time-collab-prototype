import { useEffect, useMemo, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

function App() {
  const socket = useMemo(() => io('http://localhost:3000/mediasoup'), []);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const ref = useRef<{
    device?: mediasoupClient.types.Device;
    rtpCapabilities?: mediasoupClient.types.RtpCapabilities;
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
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }
    }
  };

  const getRtpCapabilities = () => {
    socket.emit(
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
                  <button id="btnCreateSendTransport">
                    4. Create Send Transport
                  </button>
                  <br />
                  <button id="btnConnectSendTransport">
                    5. Connect Send Transport & Produce
                  </button>
                </div>
              </td>
              <td>
                <div id="sharedBtns">
                  <button id="btnRecvSendTransport">
                    6. Create Recv Transport
                  </button>
                  <br />
                  <button id="btnConnectRecvTransport">
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
