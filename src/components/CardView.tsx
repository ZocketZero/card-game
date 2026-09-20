import React from 'react';
import type { Card, Suit } from '../game/types';
import {
  getSuitColor,
  getSuitIcon,
  calculateAttackerPower,
  calculateDefenderPower,
} from '../game/engine';
import { Swords, Shield, Sparkles, Zap, Heart, Clover, Gem, Compass } from 'lucide-react';

interface CardViewProps {
  card?: Card | null;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  canAttack?: boolean;
  isTarget?: boolean;
  hasSickness?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  badgeText?: string;
  disabled?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isSelected = false,
  isPlayable = false,
  canAttack = false,
  isTarget = false,
  hasSickness = false,
  size = 'md',
  onClick,
  badgeText,
  disabled = false,
}) => {
  if (isFaceDown || !card) {
    // Elegant Card Back
    return (
      <div
        className={`card-root card-back size-${size} ${isTarget ? 'is-target' : ''}`}
        onClick={!disabled ? onClick : undefined}
      >
        <div className="card-back-pattern">
          <div className="card-back-inner">
            <Compass className="card-back-icon" />
          </div>
        </div>
        {badgeText && <span className="card-custom-badge">{badgeText}</span>}
      </div>
    );
  }

  const attackPower = card.role === 'soldier' ? calculateAttackerPower(card, false, false) : 0;
  const defendPower = card.role === 'soldier' ? calculateDefenderPower(card) : 0;

  const suitColor = getSuitColor(card.suit);
  const suitIcon = getSuitIcon(card.suit);

  const getSuitPerk = (suit: Suit) => {
    switch (suit) {
      case 'hearts': return { text: 'DEF +2', icon: Heart, color: '#ef4444' };
      case 'clubs': return { text: 'ATK +2', icon: Clover, color: '#10b981' };
      case 'diamonds': return { text: 'ฆ่าได้จั่ว 1', icon: Gem, color: '#3b82f6' };
      case 'spades': return { text: 'ลอบตี King', icon: Zap, color: '#8b5cf6' };
    }
  };

  const perk = getSuitPerk(card.suit);
  const PerkIcon = perk.icon;

  const getRoleLabel = (rank: string) => {
    if (rank === 'J') return 'อัศวินจู่โจม';
    if (rank === 'Q') return 'ที่ปรึกษา';
    if (rank === 'A') return 'อาวุธระดับตำนาน';
    if (rank === 'K') return 'ราชาธิราช';
    return 'ทหารประจำการ';
  };
  const roleLabel = getRoleLabel(card.rank);

  return (
    <div
      className={`card-root card-front size-${size} ${isSelected ? 'is-selected' : ''} ${
        isPlayable ? 'is-playable' : ''
      } ${canAttack ? 'can-attack' : ''} ${isTarget ? 'is-target' : ''} ${
        disabled ? 'is-disabled' : ''
      }`}
      onClick={!disabled ? onClick : undefined}
      style={{ '--suit-color': suitColor } as React.CSSProperties}
    >
      {/* Top Left Rank & Suit */}
      <div className="card-corner top-left">
        <span className="card-rank" style={{ color: suitColor }}>
          {card.rank}
        </span>
        <span className="card-suit-small">{suitIcon}</span>
      </div>

      {/* Center Art / Rank */}
      <div className="card-center">
        <div className="card-center-symbol" style={{ color: suitColor }}>
          {suitIcon}
        </div>
        <div className="card-role-text">{roleLabel}</div>
        {card.role === 'soldier' && (
          <div
            className="card-perk-badge"
            style={{ borderColor: perk.color, color: perk.color }}
            title={perk.text}
          >
            <PerkIcon size={size === 'sm' ? 8 : 10} />
            <span>{perk.text}</span>
          </div>
        )}
      </div>

      {/* Power Badges: ATK and DEF for Soldiers */}
      {card.role === 'soldier' && (
        <div className="card-stats-row">
          <div
            className={`card-stat-badge stat-atk ${card.suit === 'clubs' ? 'has-bonus' : ''}`}
            title={`พลังโจมตี (ATK): ${attackPower}${
              card.suit === 'clubs' ? ` (พื้นฐาน ${card.basePower} + โบนัส ♣️ 2)` : ''
            }`}
          >
            <Swords size={size === 'sm' ? 9 : size === 'lg' ? 14 : 11} />
            <span className="stat-label">ATK</span>
            <span className="stat-value">{attackPower}</span>
          </div>

          <div
            className={`card-stat-badge stat-def ${card.suit === 'hearts' ? 'has-bonus' : ''}`}
            title={`พลังป้องกัน (DEF): ${defendPower}${
              card.suit === 'hearts' ? ` (พื้นฐาน ${card.basePower} + โบนัส ❤️ 2)` : ''
            }`}
          >
            <Shield size={size === 'sm' ? 9 : size === 'lg' ? 14 : 11} />
            <span className="stat-label">DEF</span>
            <span className="stat-value">{defendPower}</span>
          </div>
        </div>
      )}

      {/* Spell Indicator for Q, A, K */}
      {card.role !== 'soldier' && (
        <div className="card-spell-footer">
          <Sparkles size={12} className="card-spell-icon" />
          <span>สกิลพิเศษ</span>
        </div>
      )}

      {/* Summoning Sickness indicator */}
      {hasSickness && (
        <div className="card-sickness-tag" title="ต้องรอ 1 เทิร์นถึงจะโจมตีได้">
          💤 ระดมพล
        </div>
      )}

      {/* Ready to attack indicator */}
      {canAttack && (
        <div className="card-ready-tag" title="พร้อมโจมตี!">
          ⚔️ โจมตีได้
        </div>
      )}

      {badgeText && <span className="card-custom-badge">{badgeText}</span>}
    </div>
  );
};
