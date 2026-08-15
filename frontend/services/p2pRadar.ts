const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

type PeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';

interface PeerConnection {
  socketId: string;
  userId: string;
  username: string;
  userColor: string;
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
  state: PeerConnectionState;
}

const peers = new Map<string, PeerConnection>();
let attachedSocket: ReturnType<typeof import('socket.io-client').io> | null = null;

export function attachP2PSocket(socket: ReturnType<typeof import('socket.io-client').io>) {
  if (attachedSocket === socket) return;
  detachP2PSocket();
  attachedSocket = socket;

  socket.on('proximity_near', (data: any) => {
    if (!data?.peerSocketId) return;
    const { peerSocketId, peerUserId, peerUsername, peerUserColor } = data;
    if (peers.has(peerSocketId)) {
      peers.get(peerSocketId)!.state = 'connected';
      return;
    }
    initPeerConnection(peerSocketId, peerUserId, peerUsername, peerUserColor, true);
  });

  socket.on('webrtc_offer', async (data: any) => {
    if (!data?.fromSocketId || !data?.sdp) return;
    const peer = peers.get(data.fromSocketId);
    if (peer) {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { targetSocketId: data.fromSocketId, sdp: answer });
    } else {
      initPeerConnection(data.fromSocketId, data.userId, data.username, data.userColor, false, data.sdp);
    }
  });

  socket.on('webrtc_answer', async (data: any) => {
    if (!data?.fromSocketId || !data?.sdp) return;
    const peer = peers.get(data.fromSocketId);
    if (peer) {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    }
  });

  socket.on('webrtc_ice_candidate', async (data: any) => {
    if (!data?.fromSocketId || !data?.candidate) return;
    const peer = peers.get(data.fromSocketId);
    if (peer && data.candidate) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn('[P2P] Failed to add ICE candidate:', err);
      }
    }
  });
}

export function detachP2PSocket() {
  Array.from(peers.entries()).forEach(([socketId, peer]) => {
    try { peer.channel?.close(); } catch {}
    try { peer.pc.close(); } catch {}
  });
  peers.clear();
  attachedSocket = null;
}

async function initPeerConnection(
  peerSocketId: string,
  userId: string,
  username: string,
  userColor: string,
  isInitiator: boolean,
  remoteSdp?: any
) {
  const socket = attachedSocket;
  if (!socket) return;

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const peer: PeerConnection = {
    socketId: peerSocketId,
    userId,
    username,
    userColor,
    pc,
    channel: null,
    state: 'connecting',
  };
  peers.set(peerSocketId, peer);

  pc.onicecandidate = (event) => {
    if (event.candidate && socket.connected) {
      socket.emit('webrtc_ice_candidate', { targetSocketId: peerSocketId, candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    peer.state = pc.connectionState as PeerConnectionState;
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      peers.delete(peerSocketId);
    }
  };

  if (isInitiator) {
    const channel = pc.createDataChannel('radar-data', { negotiated: false, ordered: false });
    setupDataChannel(channel, peerSocketId);
    peer.channel = channel;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { targetSocketId: peerSocketId, sdp: offer });
  } else if (remoteSdp) {
    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel, peerSocketId);
      peer.channel = event.channel;
    };
    await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc_answer', { targetSocketId: peerSocketId, sdp: answer });
  }
}

function setupDataChannel(channel: RTCDataChannel, peerSocketId: string) {
  channel.onopen = () => {
    console.log(`[P2P] Data channel open with ${peerSocketId}`);
  };
  channel.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'position') {
        const evt = new CustomEvent('p2p-position', { detail: { socketId: peerSocketId, lat: msg.lat, lng: msg.lng } });
        window.dispatchEvent(evt);
      }
    } catch {
      // ignore non-JSON
    }
  };
  channel.onclose = () => {
    console.log(`[P2P] Data channel closed with ${peerSocketId}`);
  };
}

export function sendPositionToPeers(lat: number, lng: number) {
  const payload = JSON.stringify({ type: 'position', lat, lng, ts: Date.now() });
  Array.from(peers.entries()).forEach(([socketId, peer]) => {
    if (peer.channel && peer.channel.readyState === 'open') {
      try {
        peer.channel.send(payload);
      } catch (err) {
        console.warn(`[P2P] Failed to send to ${socketId}:`, err);
      }
    }
  });
}

export function getActivePeers() {
  return Array.from(peers.values()).filter(p => p.state === 'connected');
}

export function getPeerCount() {
  return getActivePeers().length;
}
