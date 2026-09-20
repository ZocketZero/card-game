import React from 'react';
import type { AbilityChoice, Card, PlayerState } from '../game/types';
import { CardView } from './CardView';
import { X, Sparkles, Layers, ShieldCheck, HeartHandshake, Flame, RefreshCw } from 'lucide-react';

interface AbilityModalProps {
  card: Card;
  player: PlayerState;
  opponent: PlayerState;
  onSelectAbility: (ability: AbilityChoice, targetEnemySlot?: number) => void;
  onClose: () => void;
}

export const AbilityModal: React.FC<AbilityModalProps> = ({
  card,
  player,
  opponent,
  onSelectAbility,
  onClose,
}) => {
  const isQueen = card.rank === 'Q';
  const isAce = card.rank === 'A';
  const isKing = card.rank === 'K';

  const hasEnemySoldiers = opponent.frontLine.some((s) => s !== null);
  const canHeal = player.shields.length < 3 && player.deck.length > 0;
  const hasSoldiersInGraveyard = player.graveyard.some((c) => c.role === 'soldier');

  return (
    <div className="modal-overlay">
      <div className="modal-content ability-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles className="title-icon" />
            <span>เลือกใช้ความสามารถพิเศษ: [{card.rank} {card.suit}]</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-split">
          <div className="modal-card-preview">
            <CardView card={card} size="lg" />
          </div>

          <div className="ability-options-list">
            {/* Queen / King: Supply */}
            {(isQueen || isKing) && (
              <button
                className="ability-choice-btn"
                onClick={() => onSelectAbility('supply')}
                disabled={player.deck.length === 0}
              >
                <div className="ability-icon-wrapper supply">
                  <Layers size={24} />
                </div>
                <div className="ability-details">
                  <div className="ability-name">📦 เบิกเสบียง (Supply)</div>
                  <div className="ability-desc">จั่วไพ่เพิ่ม 2 ใบจากกองจั่วของคุณขึ้นมือ</div>
                </div>
              </button>
            )}

            {/* Queen / King: Revive */}
            {(isQueen || isKing) && (
              <button
                className="ability-choice-btn"
                onClick={() => onSelectAbility('revive')}
                disabled={!hasSoldiersInGraveyard}
              >
                <div className="ability-icon-wrapper revive">
                  <RefreshCw size={24} />
                </div>
                <div className="ability-details">
                  <div className="ability-name">✨ ชุบชีวิต (Revive)</div>
                  <div className="ability-desc">
                    ดึงทหาร 1 ใบจากกองขยะ (สุสาน) กลับขึ้นสู่มือของคุณ
                    {!hasSoldiersInGraveyard && ' (ไม่มีทหารในสุสาน)'}
                  </div>
                </div>
              </button>
            )}

            {/* Queen / King: Heal */}
            {(isQueen || isKing) && (
              <button
                className="ability-choice-btn"
                onClick={() => onSelectAbility('heal')}
                disabled={!canHeal}
              >
                <div className="ability-icon-wrapper heal">
                  <HeartHandshake size={24} />
                </div>
                <div className="ability-details">
                  <div className="ability-name">💖 เยียวยา (Heal)</div>
                  <div className="ability-desc">
                    เติมไพ่เกราะชีวิต (HP) ใต้ King เพิ่ม 1 ใบ (ปัจจุบัน {player.shields.length}/3 ใบ)
                  </div>
                </div>
              </button>
            )}

            {/* Ace / King: Destroy */}
            {(isAce || isKing) && (
              <div className="destroy-ability-section">
                <div className="section-title">
                  <Flame size={16} />
                  <span>🔥 ทำลาย (Destroy) ทหารแนวหน้าศัตรู 1 ใบ:</span>
                </div>
                {!hasEnemySoldiers ? (
                  <div className="no-target-hint">ไม่มีทหารศัตรูในสนามแนวหน้า</div>
                ) : (
                  <div className="destroy-targets-grid">
                    {opponent.frontLine.map((soldier, idx) => {
                      if (!soldier) return null;
                      return (
                        <button
                          key={`destroy-${idx}`}
                          className="destroy-target-btn"
                          onClick={() => onSelectAbility('destroy', idx)}
                        >
                          <span>ทำลายช่องที่ {idx + 1}</span>
                          <strong>[{soldier.card.rank} {soldier.card.suit}]</strong>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Ace / King: Holy Shield */}
            {(isAce || isKing) && (
              <button
                className="ability-choice-btn"
                onClick={() => onSelectAbility('holy_shield')}
                disabled={player.hasHolyShield}
              >
                <div className="ability-icon-wrapper shield">
                  <ShieldCheck size={24} />
                </div>
                <div className="ability-details">
                  <div className="ability-name">🛡️ โล่ศักดิ์สิทธิ์ (Holy Shield)</div>
                  <div className="ability-desc">
                    กางบาเรียศักดิ์สิทธิ์ป้องกันการโจมตีที่เล็งมายัง King 1 ครั้ง
                    {player.hasHolyShield && ' (กางโล่อยู่แล้ว)'}
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
