import React from 'react';
import type { PlayerState } from '../game/types';
import { CardView } from './CardView';
import { Crown, Shield, ShieldAlert, Zap } from 'lucide-react';

interface KingZoneProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  canTargetKing?: boolean;
  onTargetKing?: () => void;
}

export const KingZone: React.FC<KingZoneProps> = ({
  player,
  isCurrentPlayer,
  canTargetKing = false,
  onTargetKing,
}) => {
  const hpCount = player.shields.length;

  return (
    <div className={`king-zone-container ${isCurrentPlayer ? 'current-player' : 'opponent-player'}`}>
      <div className="king-zone-header">
        <div className="king-title">
          <Crown size={18} className="king-crown-icon" />
          <span className="player-name">{player.name}</span>
        </div>
        <div className="king-hp-indicator">
          {hpCount > 0 ? (
            <div className="hp-badge active">
              <Shield size={14} />
              <span>เกราะชีวิต: {hpCount}/3</span>
            </div>
          ) : (
            <div className="hp-badge critical">
              <ShieldAlert size={14} />
              <span>เกราะชีวิตหมด! (โจมตีซ้ำจะพ่ายแพ้)</span>
            </div>
          )}
        </div>
      </div>

      <div className="king-cards-stack">
        {/* Overlapping Shield Cards Under King */}
        <div className="shields-layer">
          {player.shields.map((shieldCard, index) => (
            <div
              key={shieldCard.id}
              className="shield-card-offset"
              style={{
                transform: `translateX(${index * 14 - 14}px) translateY(${index * 8 + 8}px)`,
                zIndex: index + 1,
              }}
            >
              <CardView card={shieldCard} isFaceDown={true} size="md" />
            </div>
          ))}
        </div>

        {/* The King Card on Top */}
        <div
          className={`king-card-wrapper ${player.hasHolyShield ? 'holy-shield-active' : ''} ${
            canTargetKing ? 'can-target-king' : ''
          }`}
          onClick={canTargetKing ? onTargetKing : undefined}
          style={{ zIndex: 10 }}
        >
          <CardView
            card={player.king}
            size="md"
            badgeText={player.hasHolyShield ? '🛡️ บาเรียศักดิ์สิทธิ์' : undefined}
          />

          {player.hasHolyShield && (
            <div className="holy-shield-aura">
              <Shield size={28} className="holy-shield-icon" />
            </div>
          )}

          {canTargetKing && (
            <div className="attack-king-prompt">
              <Zap size={16} />
              <span>สั่งโจมตี King!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
