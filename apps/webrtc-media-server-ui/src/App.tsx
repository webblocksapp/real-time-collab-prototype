import './App.css';

function App() {
  return (
    <body>
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
                  <video id="localVideo" autoPlay className="video"></video>
                </div>
              </td>
              <td>
                <div id="sharedBtns">
                  <video id="remoteVideo" autoPlay className="video"></video>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div id="sharedBtns">
                  <button id="btnLocalVideo">1. Get Local Video</button>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <div id="sharedBtns">
                  <button id="btnRtpCapabilities">
                    2. Get Rtp Capabilities
                  </button>
                  <br />
                  <button id="btnDevice">3. Create Device</button>
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
    </body>
  );
}

export default App;
