// src/@types/wrtc.d.ts

declare module 'wrtc' {
  // Represents a WebRTC peer-to-peer connection
  export class RTCPeerConnection {
    constructor(configuration?: RTCConfiguration);
    createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
    createAnswer(
      options?: RTCAnswerOptions
    ): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
    setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
    addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
    close(): void;

    onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
    ontrack: ((event: RTCTrackEvent) => void) | null;
    oniceconnectionstatechange: ((event: Event) => void) | null;
    ondatachannel: ((event: RTCDataChannelEvent) => void) | null;

    iceConnectionState: RTCIceConnectionState;
    addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender;
    removeTrack(sender: RTCRtpSender): void;
  }

  // Represents a WebRTC ICE candidate
  export class RTCIceCandidate {
    constructor(candidateInitDict: RTCIceCandidateInit);
  }

  // Represents a WebRTC media stream
  export class MediaStream {
    constructor(tracks?: MediaStreamTrack[]);
    addTrack(track: MediaStreamTrack): void;
    removeTrack(track: MediaStreamTrack): void;
  }

  // Represents a WebRTC media stream track (audio or video)
  export class MediaStreamTrack {
    kind: string;
    id: string;
    stop(): void;
  }

  // RTC Session Description
  export class RTCSessionDescription {
    constructor(descriptionInitDict: RTCSessionDescriptionInit);
  }

  // DataChannel representation in WebRTC
  export class RTCDataChannel {
    label: string;
    send(data: string | Blob | ArrayBuffer | ArrayBufferView): void;
    close(): void;

    onmessage: ((event: MessageEvent) => void) | null;
    onopen: ((event: Event) => void) | null;
    onclose: ((event: Event) => void) | null;
  }

  // RTC Data Channel Event
  export interface RTCDataChannelEvent extends Event {
    channel: RTCDataChannel;
  }

  // RTC Track Event
  export interface RTCTrackEvent extends Event {
    track: MediaStreamTrack;
    streams: MediaStream[];
  }

  // RTC Ice Candidate Event
  export interface RTCPeerConnectionIceEvent extends Event {
    candidate: RTCIceCandidate | null;
  }

  // RTC Configuration for PeerConnection
  export interface RTCConfiguration {
    iceServers?: RTCIceServer[];
  }

  // Ice Server Configuration
  export interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
  }

  // RTC Offer Options
  export interface RTCOfferOptions {
    offerToReceiveAudio?: boolean;
    offerToReceiveVideo?: boolean;
  }

  // RTC Answer Options
  export interface RTCAnswerOptions {}

  // RTC Session Description Init
  export interface RTCSessionDescriptionInit {
    type: RTCSdpType;
    sdp?: string;
  }

  // ICE Candidate Init
  export interface RTCIceCandidateInit {
    candidate?: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
    usernameFragment?: string;
  }

  // SDP Types
  export type RTCSdpType = 'offer' | 'pranswer' | 'answer' | 'rollback';
}
