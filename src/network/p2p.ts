import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameAction, GameState } from '../game/types';

export type NetworkMessage =
  | { type: 'ACTION'; action: GameAction }
  | { type: 'FULL_SYNC'; state: GameState }
  | { type: 'RESTART' }
  | { type: 'CHAT'; text: string; sender: string };

export interface P2PCallbacks {
  onConnected: (peerId: string) => void;
  onDisconnected: () => void;
  onMessage: (msg: NetworkMessage) => void;
  onError: (err: string) => void;
  onRoomCreated?: (roomId: string) => void;
}

const PEER_PREFIX = 'sov-duel-';

export class P2PNetwork {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private callbacks: P2PCallbacks;
  public isHost: boolean = false;
  public roomId: string = '';

  constructor(callbacks: P2PCallbacks) {
    this.callbacks = callbacks;
  }

  // Generate friendly 5-character room code
  public static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public createRoom(customCode?: string) {
    this.isHost = true;
    const code = (customCode || P2PNetwork.generateRoomCode()).toUpperCase();
    this.roomId = code;
    const fullPeerId = `${PEER_PREFIX}${code}`;

    this.cleanup();

    try {
      this.peer = new Peer(fullPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        const shortCode = id.replace(PEER_PREFIX, '');
        this.roomId = shortCode;
        if (this.callbacks.onRoomCreated) {
          this.callbacks.onRoomCreated(shortCode);
        }
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        this.callbacks.onError(`Peer error: ${err.type}`);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.callbacks.onError(`Failed to create room: ${msg}`);
    }
  }

  public joinRoom(roomCode: string) {
    this.isHost = false;
    const cleanCode = roomCode.trim().toUpperCase();
    this.roomId = cleanCode;
    const fullPeerId = `${PEER_PREFIX}${cleanCode}`;

    this.cleanup();

    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      this.peer.on('open', () => {
        if (!this.peer) return;
        const conn = this.peer.connect(fullPeerId, {
          reliable: true,
        });
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer join error:', err);
        this.callbacks.onError(`Connection failed: ${err.type}`);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      this.callbacks.onError(`Failed to join room: ${msg}`);
    }
  }

  private setupConnection(conn: DataConnection) {
    this.connection = conn;

    conn.on('open', () => {
      this.callbacks.onConnected(conn.peer);
    });

    conn.on('data', (data: unknown) => {
      try {
        this.callbacks.onMessage(data as NetworkMessage);
      } catch (e) {
        console.error('Failed to parse network message', e);
      }
    });

    conn.on('close', () => {
      this.callbacks.onDisconnected();
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      this.callbacks.onError(`Connection error: ${err}`);
    });
  }

  public sendMessage(msg: NetworkMessage) {
    if (this.connection && this.connection.open) {
      this.connection.send(msg);
    }
  }

  public isConnected(): boolean {
    return !!(this.connection && this.connection.open);
  }

  public cleanup() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

// Manual Offline/LAN WebRTC SDP Handshake (Zero Server)
export class ManualWebRTC {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private onMessage: (msg: NetworkMessage) => void;
  private onConnected: () => void;
  private onDisconnected: () => void;

  constructor(
    onMessage: (msg: NetworkMessage) => void,
    onConnected: () => void,
    onDisconnected: () => void
  ) {
    this.onMessage = onMessage;
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
  }

  public async createOffer(): Promise<string> {
    this.cleanup();
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.dc = this.pc.createDataChannel('game', { ordered: true });
    this.setupDataChannel(this.dc);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    return new Promise((resolve) => {
      if (!this.pc) return resolve(btoa(JSON.stringify(offer)));
      if (this.pc.iceGatheringState === 'complete') {
        resolve(btoa(JSON.stringify(this.pc.localDescription)));
      } else {
        const checkState = () => {
          if (this.pc && this.pc.iceGatheringState === 'complete') {
            this.pc.removeEventListener('icegatheringstatechange', checkState);
            resolve(btoa(JSON.stringify(this.pc.localDescription)));
          }
        };
        this.pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(() => {
          if (this.pc && this.pc.localDescription) {
            resolve(btoa(JSON.stringify(this.pc.localDescription)));
          }
        }, 2500);
      }
    });
  }

  public async acceptOfferAndCreateAnswer(offerB64: string): Promise<string> {
    this.cleanup();
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.pc.ondatachannel = (e) => {
      this.dc = e.channel;
      this.setupDataChannel(this.dc);
    };

    const offerDesc = JSON.parse(atob(offerB64.trim()));
    await this.pc.setRemoteDescription(offerDesc);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return new Promise((resolve) => {
      if (!this.pc) return resolve(btoa(JSON.stringify(answer)));
      if (this.pc.iceGatheringState === 'complete') {
        resolve(btoa(JSON.stringify(this.pc.localDescription)));
      } else {
        const checkState = () => {
          if (this.pc && this.pc.iceGatheringState === 'complete') {
            this.pc.removeEventListener('icegatheringstatechange', checkState);
            resolve(btoa(JSON.stringify(this.pc.localDescription)));
          }
        };
        this.pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(() => {
          if (this.pc && this.pc.localDescription) {
            resolve(btoa(JSON.stringify(this.pc.localDescription)));
          }
        }, 2500);
      }
    });
  }

  public async acceptAnswer(answerB64: string): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const answerDesc = JSON.parse(atob(answerB64.trim()));
    await this.pc.setRemoteDescription(answerDesc);
  }

  private setupDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      this.onConnected();
    };
    dc.onclose = () => {
      this.onDisconnected();
    };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as NetworkMessage;
        this.onMessage(msg);
      } catch (err) {
        console.error('Failed to parse WebRTC message', err);
      }
    };
  }

  public sendMessage(msg: NetworkMessage) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(msg));
    }
  }

  public isConnected(): boolean {
    return !!(this.dc && this.dc.readyState === 'open');
  }

  public cleanup() {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
