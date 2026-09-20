import React, { useState } from 'react';
import {
  X,
  Wifi,
  Radio,
  Bot,
  Users,
  Copy,
  Check,
  Play,
  Share2,
  Shield,
  Network,
} from 'lucide-react';

export type GameMode = 'online_p2p' | 'offline_sdp' | 'pass_and_play' | 'vs_ai';

interface LobbyModalProps {
  currentMode?: GameMode;
  roomCode: string;
  isHost?: boolean;
  isConnected: boolean;
  connectionStatus: string;
  onCreateOnlineRoom: (customCode?: string) => void;
  onJoinOnlineRoom: (code: string) => void;
  onCreateSdpOffer: () => Promise<string>;
  onAcceptSdpOfferAndGetAnswer: (offer: string) => Promise<string>;
  onAcceptSdpAnswer: (answer: string) => Promise<void>;
  onStartVsAI: () => void;
  onStartPassAndPlay: () => void;
  onClose: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  currentMode = 'online_p2p',
  roomCode,
  isHost = true,
  isConnected,
  connectionStatus,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onCreateSdpOffer,
  onAcceptSdpOfferAndGetAnswer,
  onAcceptSdpAnswer,
  onStartVsAI,
  onStartPassAndPlay,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'lan' | 'local'>(() => {
    if (currentMode === 'offline_sdp') return 'lan';
    if (currentMode === 'vs_ai' || currentMode === 'pass_and_play') return 'local';
    return 'online';
  });
  const [inputCode, setInputCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedOffer, setCopiedOffer] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  // Direct SDP state
  const [sdpRole, setSdpRole] = useState<'host' | 'guest'>('host');
  const [generatedOffer, setGeneratedOffer] = useState('');
  const [guestInputOffer, setGuestInputOffer] = useState('');
  const [generatedAnswer, setGeneratedAnswer] = useState('');
  const [hostInputAnswer, setHostInputAnswer] = useState('');
  const [sdpLoading, setSdpLoading] = useState(false);

  const handleCopyShareLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGenerateOffer = async () => {
    setSdpLoading(true);
    try {
      const offer = await onCreateSdpOffer();
      setGeneratedOffer(offer);
    } catch (e) {
      console.error(e);
    } finally {
      setSdpLoading(false);
    }
  };

  const handleCreateAnswer = async () => {
    if (!guestInputOffer.trim()) return;
    setSdpLoading(true);
    try {
      const answer = await onAcceptSdpOfferAndGetAnswer(guestInputOffer);
      setGeneratedAnswer(answer);
    } catch (e) {
      console.error(e);
    } finally {
      setSdpLoading(false);
    }
  };

  const handleFinishAnswer = async () => {
    if (!hostInputAnswer.trim()) return;
    setSdpLoading(true);
    try {
      await onAcceptSdpAnswer(hostInputAnswer);
    } catch (e) {
      console.error(e);
    } finally {
      setSdpLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content lobby-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Radio className="title-icon" />
            <span>ศูนย์รวมห้องเล่นและการเชื่อมต่อ (P2P Room Hub)</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="lobby-tabs-bar">
          <button
            className={`lobby-tab ${activeTab === 'online' ? 'active' : ''}`}
            onClick={() => setActiveTab('online')}
          >
            <Wifi size={16} />
            <span>ออนไลน์ไร้เซิร์ฟเวอร์ (Room Code)</span>
          </button>
          <button
            className={`lobby-tab ${activeTab === 'lan' ? 'active' : ''}`}
            onClick={() => setActiveTab('lan')}
          >
            <Network size={16} />
            <span>LAN / ออฟไลน์ 100% (Direct SDP)</span>
          </button>
          <button
            className={`lobby-tab ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            <Users size={16} />
            <span>เล่นในเครื่องเดียว / บอท AI</span>
          </button>
        </div>

        <div className="lobby-tab-body">
          {/* TAB 1: Online Room Code */}
          {activeTab === 'online' && (
            <div className="online-tab-content">
              <div className="network-explainer">
                <Shield size={18} />
                <span>
                  เชื่อมต่อโดยตรงระหว่างผู้เล่น (P2P WebRTC) ข้ามอินเทอร์เน็ตได้โดยไม่ต้องมีเซิร์ฟเวอร์กลาง
                </span>
              </div>

              <div className="room-actions-split">
                {/* Create Room Box */}
                <div className="room-box create-box">
                  <h4>👑 สร้างห้องเล่นใหม่ (Host)</h4>
                  <p>สร้างห้องเพื่อรับรหัสสั้นๆ ส่งให้เพื่อนเข้าเล่นได้ทันที</p>

                  {roomCode ? (
                    <div className="current-room-display">
                      <div className="code-label">รหัสห้องของคุณ ({isHost ? 'ผู้สร้างห้อง / Host' : 'ผู้เข้าร่วม / Guest'}):</div>
                      <div className="room-code-badge">{roomCode}</div>
                      <div className="room-share-actions">
                        <button className="share-btn" onClick={handleCopyShareLink}>
                          {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                          <span>{copiedLink ? 'คัดลอกลิงก์สำเร็จ!' : 'คัดลอกลิงก์ชวนเพื่อน'}</span>
                        </button>
                      </div>
                      <div className="status-indicator">
                        <span className={`status-dot ${isConnected ? 'connected' : 'waiting'}`} />
                        <span>{connectionStatus || 'กำลังรอผู้เล่นคนที่ 2 เข้าร่วม...'}</span>
                      </div>
                    </div>
                  ) : (
                    <button className="primary-action-btn" onClick={() => onCreateOnlineRoom()}>
                      <Radio size={18} />
                      <span>กดเพื่อสร้างห้องใหม่</span>
                    </button>
                  )}
                </div>

                {/* Join Room Box */}
                <div className="room-box join-box">
                  <h4>⚔️ เข้าร่วมห้องเพื่อน (Join)</h4>
                  <p>กรอกรหัสห้อง 5 หลักที่เพื่อนส่งให้เพื่อเข้าร่วม</p>

                  <div className="join-form">
                    <input
                      type="text"
                      className="room-input"
                      placeholder="ใส่รหัสห้อง เช่น SOV-12"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                    <button
                      className="primary-action-btn join-btn"
                      onClick={() => onJoinOnlineRoom(inputCode)}
                      disabled={!inputCode.trim()}
                    >
                      <Play size={18} />
                      <span>เข้าร่วมห้อง</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Direct SDP / LAN Mode */}
          {activeTab === 'lan' && (
            <div className="lan-tab-content">
              <div className="network-explainer">
                <Network size={18} />
                <span>
                  โหมดเชื่อมต่อตรง 100% ผ่าน Handshake Code สำหรับวงแลนปิด หรือเมื่อไม่มีอินเทอร์เน็ต
                </span>
              </div>

              <div className="sdp-role-switch">
                <button
                  className={`role-btn ${sdpRole === 'host' ? 'active' : ''}`}
                  onClick={() => setSdpRole('host')}
                >
                  ผู้สร้างห้อง (Host)
                </button>
                <button
                  className={`role-btn ${sdpRole === 'guest' ? 'active' : ''}`}
                  onClick={() => setSdpRole('guest')}
                >
                  ผู้เข้าร่วม (Guest)
                </button>
              </div>

              {sdpRole === 'host' ? (
                <div className="sdp-step-box">
                  <h5>ขั้นตอนที่ 1: กดสร้างรหัสเชื่อมต่อ (Offer)</h5>
                  <button
                    className="primary-action-btn"
                    onClick={handleGenerateOffer}
                    disabled={sdpLoading}
                  >
                    {sdpLoading ? 'กำลังสร้างรหัส...' : 'สร้าง Offer Code'}
                  </button>

                  {generatedOffer && (
                    <div className="code-box-group">
                      <label>คัดลอกรหัสนี้ส่งให้เพื่อน:</label>
                      <textarea readOnly value={generatedOffer} rows={3} className="sdp-textarea" />
                      <button
                        className="share-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedOffer);
                          setCopiedOffer(true);
                          setTimeout(() => setCopiedOffer(false), 2000);
                        }}
                      >
                        {copiedOffer ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedOffer ? 'คัดลอกแล้ว!' : 'คัดลอก Offer'}</span>
                      </button>
                    </div>
                  )}

                  <div className="code-box-group" style={{ marginTop: '16px' }}>
                    <label>ขั้นตอนที่ 2: วางรหัสตอบกลับ (Answer) จากเพื่อนที่นี่:</label>
                    <textarea
                      rows={3}
                      className="sdp-textarea"
                      placeholder="วางรหัส Answer จากเพื่อนที่นี่..."
                      value={hostInputAnswer}
                      onChange={(e) => setHostInputAnswer(e.target.value)}
                    />
                    <button
                      className="primary-action-btn"
                      onClick={handleFinishAnswer}
                      disabled={!hostInputAnswer.trim() || sdpLoading}
                    >
                      <span>ยืนยันเชื่อมต่อ</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sdp-step-box">
                  <h5>ขั้นตอนที่ 1: วางรหัส Offer จาก Host</h5>
                  <textarea
                    rows={3}
                    className="sdp-textarea"
                    placeholder="วาง Offer จาก Host ที่นี่..."
                    value={guestInputOffer}
                    onChange={(e) => setGuestInputOffer(e.target.value)}
                  />
                  <button
                    className="primary-action-btn"
                    onClick={handleCreateAnswer}
                    disabled={!guestInputOffer.trim() || sdpLoading}
                  >
                    {sdpLoading ? 'กำลังประมวลผล...' : 'สร้าง Answer Code'}
                  </button>

                  {generatedAnswer && (
                    <div className="code-box-group" style={{ marginTop: '16px' }}>
                      <label>ขั้นตอนที่ 2: คัดลอกรหัสนี้ส่งกลับให้ Host:</label>
                      <textarea readOnly value={generatedAnswer} rows={3} className="sdp-textarea" />
                      <button
                        className="share-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedAnswer);
                          setCopiedAnswer(true);
                          setTimeout(() => setCopiedAnswer(false), 2000);
                        }}
                      >
                        {copiedAnswer ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedAnswer ? 'คัดลอกแล้ว!' : 'คัดลอก Answer'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Local Modes */}
          {activeTab === 'local' && (
            <div className="local-tab-content">
              <div className="local-modes-grid">
                <div className="local-card" onClick={onStartVsAI}>
                  <div className="local-icon bot">
                    <Bot size={36} />
                  </div>
                  <h4>เล่นกับ AI Bot (Solo Match)</h4>
                  <p>ฝึกฝนฝีมือและทดสอบกลยุทธ์การเล่นกับคอมพิวเตอร์อัจฉริยะ เล่นได้ทันทีโดยไม่ต้องรอเพื่อน</p>
                  <button className="primary-action-btn">
                    <Play size={16} />
                    <span>เริ่มเล่นกับ AI</span>
                  </button>
                </div>

                <div className="local-card" onClick={onStartPassAndPlay}>
                  <div className="local-icon local">
                    <Users size={36} />
                  </div>
                  <h4>สลับกันเล่นบนเครื่องเดียว (Pass & Play)</h4>
                  <p>ผลัดกันวางแผนบนหน้าจอเดียวกัน เหมาะสำหรับการเล่นกับเพื่อนข้างๆ หรือทดสอบระบบสองฝั่ง</p>
                  <button className="primary-action-btn">
                    <Play size={16} />
                    <span>เริ่มเล่น Pass & Play</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
