import React from 'react';
import type { PlayerState } from '../game/types';
import { Sparkles, ArrowRightCircle, BookOpen, ScrollText, Volume2, VolumeX, X, Skull } from 'lucide-react';

interface ActionControlsProps {
  player: PlayerState;
  isPlayerTurn: boolean;
  selectedAttackerIds: string[];
  selectedAttackerCardsNames: string[];
  totalAttackerPower: number;
  onClearAttackerSelection: () => void;
  onEndTurn: () => void;
  onOpenRulebook: () => void;
  onOpenCombatLog: () => void;
  onOpenGraveyard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenLobby: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  player,
  isPlayerTurn,
  selectedAttackerIds,
  selectedAttackerCardsNames,
  totalAttackerPower,
  onClearAttackerSelection,
  onEndTurn,
  onOpenRulebook,
  onOpenCombatLog,
  onOpenGraveyard,
  isMuted,
  onToggleMute,
  onOpenLobby,
}) => {
  return (
    <div className="action-controls-container">
      {/* Selection / Combo Notification Bar */}
      {selectedAttackerIds.length > 0 && (
        <div className="attacker-selection-banner">
          <div className="selection-info">
            <span className="combo-badge">
              {selectedAttackerIds.length === 2 ? '⚔️ โหมดคอมโบ 2 ใบ' : '🗡️ โหมดโจมตีเดี่ยว'}
            </span>
            <span className="selection-text">
              เลือก: <strong>{selectedAttackerCardsNames.join(' + ')}</strong> (พลังโจมตี: {totalAttackerPower})
            </span>
            {selectedAttackerIds.length === 1 && (
              <span className="combo-hint">💡 คลิกทหารอีกใบในสนามเพื่อรวมพลังคอมโบได้</span>
            )}
            <span className="target-hint">👉 คลิกเป้าหมายทหารศัตรู หรือ King เพื่อโจมตี</span>
          </div>
          <button className="cancel-selection-btn" onClick={onClearAttackerSelection} title="ยกเลิกการเลือก">
            <X size={16} />
            <span>ยกเลิก</span>
          </button>
        </div>
      )}

      {/* Bottom Main Bar */}
      <div className="action-bar-grid">
        {/* Left: Action Points Orbs */}
        <div className="ap-cluster">
          <div className="ap-label">
            <Sparkles size={16} className="ap-icon" />
            <span>Action Points (AP):</span>
          </div>
          <div className="ap-orbs">
            {[0, 1].map((index) => {
              const isFilled = isPlayerTurn && index < player.actionPoints;
              return (
                <div
                  key={`ap-orb-${index}`}
                  className={`ap-orb ${isFilled ? 'filled' : 'empty'}`}
                  title={isFilled ? 'มีแต้มสั่งการ' : 'ใช้แต้มไปแล้ว'}
                />
              );
            })}
            <span className="ap-count">{isPlayerTurn ? player.actionPoints : 0}/2</span>
          </div>
        </div>

        {/* Center: Turn Status & End Turn Button */}
        <div className="turn-center-action">
          {isPlayerTurn ? (
            <button className="end-turn-button active" onClick={onEndTurn}>
              <span>จบเทิร์นของคุณ</span>
              <ArrowRightCircle size={20} />
            </button>
          ) : (
            <div className="turn-waiting-badge">
              <span className="waiting-spinner"></span>
              <span>กำลังรอเทิร์นของคู่ต่อสู้...</span>
            </div>
          )}
        </div>

        {/* Right: Quick Tools */}
        <div className="quick-tools-cluster">
          <button className="tool-btn" onClick={onOpenGraveyard} title="ดูกองขยะ/สุสาน">
            <Skull size={18} />
            <span>สุสาน ({player.graveyard.length})</span>
          </button>
          <button className="tool-btn" onClick={onOpenCombatLog} title="บันทึกการรบ">
            <ScrollText size={18} />
            <span>บันทึกการรบ</span>
          </button>
          <button className="tool-btn" onClick={onOpenRulebook} title="คู่มือกฎการเล่น">
            <BookOpen size={18} />
            <span>กฎกติกา</span>
          </button>
          <button className="tool-btn icon-only" onClick={onToggleMute} title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="tool-btn lobby-btn" onClick={onOpenLobby} title="ตั้งค่าห้อง / ห้องเล่น">
            <span>ห้องเล่น</span>
          </button>
        </div>
      </div>
    </div>
  );
};
