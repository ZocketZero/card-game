import React, { useEffect } from 'react';
import type { Card } from '../game/types';
import { CardView } from './CardView';
import { Swords, Shield, Zap, Sparkles, Layers, RefreshCw, HeartHandshake, Flame, ShieldAlert, Crown } from 'lucide-react';

export interface ActionBannerData {
  id: string;
  type: 'combat' | 'king_attack' | 'ability' | 'deploy' | 'turn_start' | 'enter_attack';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'success' | 'danger' | 'warning' | 'info' | 'purple';
  attackerCards?: Card[];
  defenderCard?: Card | null;
  totalAtk?: number;
  totalDef?: number;
  resultText?: string;
  bonusText?: string;
  kingDamage?: number;
  shieldBlocked?: boolean;
  abilityCard?: Card;
  abilityChoice?: string;
  turnNumber?: number;
  isMyTurn?: boolean;
  playerName?: string;
}

interface ActionBannerProps {
  data: ActionBannerData | null;
  onDismiss: () => void;
}

export const ActionBanner: React.FC<ActionBannerProps> = ({ data, onDismiss }) => {
  useEffect(() => {
    if (!data) return;
    const duration = data.type === 'combat' || data.type === 'king_attack' ? 2200 : 1600;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [data, onDismiss]);

  if (!data) return null;

  // Attack Phase Banner
  if (data.type === 'enter_attack') {
    return (
      <div className="action-banner-overlay" onClick={onDismiss}>
        <div className="attack-phase-banner animate-clash-pop">
          <div className="attack-phase-icon-ring">
            <Swords size={32} className="attack-phase-swords-icon" />
          </div>
          <div className="attack-phase-texts">
            <span className="attack-phase-title">{data.title}</span>
            <span className="attack-phase-subtitle">{data.subtitle}</span>
          </div>
          <span className="click-to-dismiss-hint">คลิกเพื่อสั่งการโจมตี</span>
        </div>
      </div>
    );
  }

  // Turn Start Banner
  if (data.type === 'turn_start') {
    return (
      <div className="action-banner-overlay" onClick={onDismiss}>
        <div className={`turn-banner-ribbon ${data.isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
          <div className="turn-ribbon-content">
            {data.isMyTurn ? (
              <>
                <Swords size={28} className="turn-icon" />
                <div className="turn-text-cluster">
                  <span className="turn-main-title">เทิร์นของคุณ!</span>
                  <span className="turn-sub-title">เทิร์นที่ {data.turnNumber} • มี 2 Action Points (AP)</span>
                </div>
                <Crown size={28} className="turn-icon-gold" />
              </>
            ) : (
              <>
                <Zap size={26} className="turn-icon" />
                <div className="turn-text-cluster">
                  <span className="turn-main-title">เทิร์นของ {data.playerName}</span>
                  <span className="turn-sub-title">เทิร์นที่ {data.turnNumber} • กำลังวางแผน...</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Combat Clash Banner (Soldier vs Soldier)
  if (data.type === 'combat') {
    return (
      <div className="action-banner-overlay" onClick={onDismiss}>
        <div className="combat-clash-card animate-clash-pop">
          <div className="clash-card-header">
            <Swords size={18} className="clash-header-icon" />
            <span>{data.title}</span>
          </div>

          <div className="clash-duel-arena">
            {/* Attacker Side */}
            <div className="clash-fighter attacker-side">
              <span className="fighter-role-tag attacker">ฝ่ายโจมตี</span>
              <div className="clash-cards-row">
                {data.attackerCards?.map((card) => (
                  <CardView key={card.id} card={card} size="sm" />
                ))}
              </div>
              <div className="clash-power-badge atk-badge">
                <Swords size={14} />
                <span>ATK {data.totalAtk}</span>
              </div>
            </div>

            {/* Clash Middle VS Symbol */}
            <div className="clash-mid-emblem">
              <div className="clash-sparks-ring">
                <Swords size={32} className="mid-swords-icon" />
              </div>
              <span className="vs-tag">VS</span>
            </div>

            {/* Defender Side */}
            <div className="clash-fighter defender-side">
              <span className="fighter-role-tag defender">ฝ่ายป้องกัน</span>
              {data.defenderCard && <CardView card={data.defenderCard} size="sm" />}
              <div className="clash-power-badge def-badge">
                <Shield size={14} />
                <span>DEF {data.totalDef}</span>
              </div>
            </div>
          </div>

          {/* Clash Result Footer */}
          <div className={`clash-result-badge badge-${data.badgeType || 'info'}`}>
            <span className="result-text">{data.resultText}</span>
            {data.bonusText && <span className="result-bonus">{data.bonusText}</span>}
          </div>

          <span className="click-to-dismiss-hint">คลิกเพื่อดำเนินการต่อ</span>
        </div>
      </div>
    );
  }

  // King Attack Banner
  if (data.type === 'king_attack') {
    return (
      <div className="action-banner-overlay" onClick={onDismiss}>
        <div className="king-assault-card animate-clash-pop">
          <div className="clash-card-header king-header">
            <Crown size={18} className="clash-header-icon" />
            <span>{data.title}</span>
          </div>

          <div className="king-assault-body">
            <div className="assault-attacker">
              <div className="clash-cards-row">
                {data.attackerCards?.map((card) => (
                  <CardView key={card.id} card={card} size="sm" />
                ))}
              </div>
              <div className="clash-power-badge atk-badge">
                <Swords size={14} />
                <span>ATK {data.totalAtk}</span>
              </div>
            </div>

            <div className="assault-arrow">
              <Zap size={28} className="assault-zap-icon" />
            </div>

            <div className="assault-target">
              <div className="king-target-emblem">
                <Crown size={36} />
              </div>
              <span className="target-king-label">ราชา (King)</span>
            </div>
          </div>

          <div className={`clash-result-badge badge-${data.badgeType || 'danger'}`}>
            <span className="result-text">{data.resultText}</span>
          </div>

          <span className="click-to-dismiss-hint">คลิกเพื่อดำเนินการต่อ</span>
        </div>
      </div>
    );
  }

  // Ability Use Banner
  if (data.type === 'ability') {
    const getAbilityIcon = () => {
      switch (data.abilityChoice) {
        case 'supply': return <Layers size={26} className="ability-icon supply" />;
        case 'revive': return <RefreshCw size={26} className="ability-icon revive" />;
        case 'heal': return <HeartHandshake size={26} className="ability-icon heal" />;
        case 'destroy': return <Flame size={26} className="ability-icon destroy" />;
        case 'holy_shield': return <ShieldAlert size={26} className="ability-icon holy_shield" />;
        default: return <Sparkles size={26} className="ability-icon" />;
      }
    };

    return (
      <div className="action-banner-overlay" onClick={onDismiss}>
        <div className="ability-cast-card animate-clash-pop">
          <div className="clash-card-header ability-header">
            <Sparkles size={18} className="clash-header-icon" />
            <span>{data.title}</span>
          </div>

          <div className="ability-cast-body">
            {data.abilityCard && (
              <div className="ability-card-preview">
                <CardView card={data.abilityCard} size="sm" />
              </div>
            )}
            <div className="ability-info-cluster">
              <div className="ability-icon-circle">
                {getAbilityIcon()}
              </div>
              <div className="ability-text-info">
                <span className="ability-highlight-name">{data.subtitle}</span>
                <span className="ability-highlight-desc">{data.resultText}</span>
              </div>
            </div>
          </div>

          <span className="click-to-dismiss-hint">คลิกเพื่อดำเนินการต่อ</span>
        </div>
      </div>
    );
  }

  // Fast Deploy Toast
  return (
    <div className="action-banner-overlay-top" onClick={onDismiss}>
      <div className="deploy-toast-card animate-toast-slide">
        <Sparkles size={16} className="toast-icon" />
        <span className="toast-text">{data.title}</span>
      </div>
    </div>
  );
};
