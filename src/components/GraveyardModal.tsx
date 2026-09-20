import React from 'react';
import type { Card } from '../game/types';
import { CardView } from './CardView';
import { X, Skull } from 'lucide-react';

interface GraveyardModalProps {
  cards: Card[];
  title: string;
  isReviveMode?: boolean;
  onSelectReviveCard?: (card: Card) => void;
  onClose: () => void;
}

export const GraveyardModal: React.FC<GraveyardModalProps> = ({
  cards,
  title,
  isReviveMode = false,
  onSelectReviveCard,
  onClose,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content graveyard-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Skull className="title-icon" />
            <span>{title} ({cards.length} ใบ)</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {isReviveMode && (
          <div className="revive-header-hint">
            👉 คลิกเลือกทหาร 1 ใบที่ต้องการชุบชีวิตกลับขึ้นมือของคุณ
          </div>
        )}

        <div className="graveyard-cards-grid">
          {cards.length === 0 ? (
            <div className="empty-graveyard-msg">ยังไม่มีการ์ดในสุสาน</div>
          ) : (
            cards.map((card) => {
              const canRevive = isReviveMode && card.role === 'soldier';
              return (
                <div
                  key={card.id}
                  className={`graveyard-card-item ${canRevive ? 'can-revive' : ''}`}
                  onClick={() => canRevive && onSelectReviveCard && onSelectReviveCard(card)}
                >
                  <CardView card={card} size="sm" isPlayable={canRevive} />
                  {canRevive && <span className="revive-badge">ชุบชีวิต</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
