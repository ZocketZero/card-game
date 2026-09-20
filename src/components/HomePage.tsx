import { useState } from 'react';
import type { Suit } from '../game/types';
import {
  Crown,
  Bot,
  Wifi,
  Users,
  Network,
  BookOpen,
  Play,
  ArrowRight,
  Shield,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HomePageProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  playerKingSuit: Suit;
  onPlayerKingSuitChange: (suit: Suit) => void;
  onPlayVsAI: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onPassAndPlay: () => void;
  onOpenLanMode: () => void;
  onOpenRulebook: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  playerName,
  onPlayerNameChange,
  playerKingSuit,
  onPlayerKingSuitChange,
  onPlayVsAI,
  onCreateRoom,
  onJoinRoom,
  onPassAndPlay,
  onOpenLanMode,
  onOpenRulebook,
  isMuted,
  onToggleMute,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const kingSuits: { suit: Suit; label: string; icon: string; perk: string; color: string }[] = [
    { suit: 'spades', label: 'โพดำ (Spades)', icon: '♠️', perk: 'หน่วยลอบสังหาร', color: '#a78bfa' },
    { suit: 'hearts', label: 'โพแดง (Hearts)', icon: '♥️', perk: 'เกราะป้องกัน +2', color: '#f87171' },
    { suit: 'clubs', label: 'ดอกจิก (Clubs)', icon: '♣️', perk: 'พลังโจมตี +2', color: '#34d399' },
    { suit: 'diamonds', label: 'ข้าวหลามตัด (Diamonds)', icon: '♦️', perk: 'สังหารได้จั่วการ์ด', color: '#60a5fa' },
  ];

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCodeInput.trim()) {
      onJoinRoom(joinCodeInput.trim());
    }
  };

  return (
    <div className="homepage-container">
      {/* Top Floating Controls */}
      <div className="home-top-controls">
        <button
          className="home-tool-btn"
          onClick={onOpenRulebook}
          title="ดูกฎกติกาการเล่น"
        >
          <BookOpen size={18} />
          <span>กฎกติกาการเล่น</span>
        </button>
        <button
          className="home-tool-btn icon-only"
          onClick={onToggleMute}
          title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Hero Branding Section */}
      <section className="home-hero-section">
        <div className="crown-emblem-wrapper">
          <Crown className="home-crown-icon" size={64} />
          <div className="crown-pulse-ring"></div>
        </div>
        <h1 className="home-main-title">THE SOVEREIGN’S DUEL</h1>
        <div className="home-sub-title">⚔️ ศึกชิงบัลลังก์เดือด ⚔️</div>
        <p className="home-description">
          เกมการวางแผนรบด้วยไพ่ป๊อกสำหรับผู้เล่น 2 คน • เชื่อมต่อโดยตรงแบบ P2P ไร้เซิร์ฟเวอร์กลาง
        </p>
      </section>

      {/* Commander Customization Bar */}
      <section className="home-customization-card">
        <div className="custom-input-group">
          <label className="custom-label">
            <Shield size={16} />
            <span>ชื่อแม่ทัพของคุณ:</span>
          </label>
          <input
            type="text"
            className="home-name-input"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="ใส่ชื่อของคุณ"
            maxLength={18}
          />
        </div>

        <div className="custom-suit-group">
          <label className="custom-label">
            <Zap size={16} />
            <span>เลือกตราประจำราชา (King Suit):</span>
          </label>
          <div className="suit-selector-chips">
            {kingSuits.map((item) => {
              const isSelected = playerKingSuit === item.suit;
              return (
                <button
                  key={item.suit}
                  type="button"
                  className={`suit-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => onPlayerKingSuitChange(item.suit)}
                  style={{ '--suit-accent': item.color } as React.CSSProperties}
                >
                  <span className="suit-chip-icon">{item.icon}</span>
                  <div className="suit-chip-text">
                    <span className="suit-chip-title">{item.label}</span>
                    <span className="suit-chip-perk">{item.perk}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Primary Action Modes Grid */}
      <section className="home-modes-grid">
        {/* Card 1: Play vs AI Bot */}
        <div className="mode-card highlight-card" onClick={onPlayVsAI}>
          <div className="mode-icon-wrapper bot">
            <Bot size={36} />
          </div>
          <div className="mode-card-content">
            <div className="mode-badge ai-badge">เริ่มเล่นทันที</div>
            <h3>ประลองกับ AI บอท (Solo vs Bot)</h3>
            <p>
              ฝึกฝนฝีมือและวางแผนรบกับคอมพิวเตอร์อัจฉริยะ ระบบจะคิด วิเคราะห์ และสั่งการทหารให้อัตโนมัติ
            </p>
          </div>
          <button className="mode-action-btn primary" onClick={onPlayVsAI}>
            <Play size={18} />
            <span>เล่นกับบอทเดี๋ยวนี้</span>
          </button>
        </div>

        {/* Card 2: Create P2P Room */}
        <div className="mode-card" onClick={onCreateRoom}>
          <div className="mode-icon-wrapper host">
            <Crown size={36} />
          </div>
          <div className="mode-card-content">
            <div className="mode-badge p2p-badge">ผู้เล่น 2 คน (P2P)</div>
            <h3>สร้างห้องเล่นออนไลน์ (Create Room)</h3>
            <p>
              สร้างห้องเพื่อรับรหัสห้อง 5 หลัก หรือส่งลิงก์เชิญเพื่อนเข้ามาดวลกันผ่านเน็ตเวิร์กได้ทันที
            </p>
          </div>
          <button className="mode-action-btn host-btn" onClick={onCreateRoom}>
            <Wifi size={18} />
            <span>สร้างห้องใหม่</span>
          </button>
        </div>

        {/* Card 3: Join Room */}
        <div className="mode-card join-card">
          <div className="mode-icon-wrapper join">
            <Play size={36} />
          </div>
          <div className="mode-card-content">
            <div className="mode-badge join-badge">ใส่รหัสเพื่อน</div>
            <h3>เข้าร่วมห้องเล่น (Join Room)</h3>
            <p>กรอกรหัสห้อง 5 หลักที่เพื่อนส่งให้เพื่อเชื่อมต่อเข้าสู่ศึกชิงบัลลังก์</p>
          </div>
          <form className="join-room-inline-form" onSubmit={handleJoinSubmit} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="inline-code-input"
              placeholder="รหัสห้อง เช่น SOV-12"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <button
              type="submit"
              className="mode-action-btn join-submit-btn"
              disabled={!joinCodeInput.trim()}
            >
              <span>เข้าร่วม</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Card 4: Pass & Play */}
        <div className="mode-card" onClick={onPassAndPlay}>
          <div className="mode-icon-wrapper pass">
            <Users size={36} />
          </div>
          <div className="mode-card-content">
            <div className="mode-badge local-badge">เครื่องเดียวกัน</div>
            <h3>สลับกันเล่น 2 คน (Pass & Play)</h3>
            <p>
              ผลัดกันวางแผนบนหน้าจอเดียวกัน เหมาะสำหรับการเล่นกับเพื่อนที่อยู่ข้างๆ หรือทดสอบกติกา
            </p>
          </div>
          <button className="mode-action-btn local-btn" onClick={onPassAndPlay}>
            <Users size={18} />
            <span>เริ่ม Pass & Play</span>
          </button>
        </div>

        {/* Card 5: LAN / Offline Direct SDP */}
        <div className="mode-card full-width-card" onClick={onOpenLanMode}>
          <div className="mode-icon-wrapper lan">
            <Network size={36} />
          </div>
          <div className="mode-card-content">
            <div className="mode-badge lan-badge">ออฟไลน์ 100% / ไม่ต้องมีเน็ต</div>
            <h3>เชื่อมต่อวง LAN ปิด / ออฟไลน์ (Direct WebRTC Handshake)</h3>
            <p>
              เล่นผ่านวง LAN วงปิด หรือเชื่อมต่อกันแบบไร้อินเทอร์เน็ต 100% ด้วยการคัดลอกรหัส Handshake Code โดยตรง
            </p>
          </div>
          <button className="mode-action-btn lan-btn" onClick={onOpenLanMode}>
            <Network size={18} />
            <span>เปิดโหมด Handshake</span>
          </button>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="home-footer-info">
        <div className="feature-pill">
          <Shield size={14} />
          <span>ไร้เซิร์ฟเวอร์กลาง (Serverless WebRTC)</span>
        </div>
        <div className="feature-pill">
          <Zap size={14} />
          <span>Realtime DataChannel Latency ต่ำ</span>
        </div>
        <div className="feature-pill">
          <BookOpen size={14} />
          <span>กติกาแท้ The Sovereign's Duel</span>
        </div>
      </footer>
    </div>
  );
};
