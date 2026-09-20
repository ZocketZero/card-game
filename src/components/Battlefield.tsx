import type { Card, PlayerState, Soldier } from '../game/types';
import { CardView } from './CardView';
import { Swords, Plus } from 'lucide-react';
import { canSoldierAttack, calculateAttackerPower, calculateDefenderPower } from '../game/engine';

interface BattlefieldProps {
  opponent: PlayerState;
  player: PlayerState;
  currentTurn: number;
  isPlayerTurn: boolean;
  selectedAttackerIds: string[];
  selectedHandCard: Card | null;
  onSelectAttacker: (soldier: Soldier) => void;
  onTargetDefender: (slotIndex: number) => void;
  onDeployToSlot: (slotIndex: number) => void;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
  opponent,
  player,
  currentTurn,
  isPlayerTurn,
  selectedAttackerIds,
  selectedHandCard,
  onSelectAttacker,
  onTargetDefender,
  onDeployToSlot,
}) => {
  const isDeploying = selectedHandCard?.role === 'soldier';

  const selectedAttackerCards: Soldier[] = player.frontLine.filter(
    (s): s is Soldier => s !== null && selectedAttackerIds.includes(s.card.id)
  );
  let totalAttackerPower = 0;
  for (const s of selectedAttackerCards) {
    totalAttackerPower += calculateAttackerPower(s.card, false, false);
  }

  return (
    <div className="battlefield-container">
      {/* Opponent Frontline (3 Slots) */}
      <div className="frontline-row opponent-frontline">
        <div className="frontline-label">แนวหน้าศัตรู (สูงสุด 3 กองกำลัง)</div>
        <div className="slots-grid">
          {opponent.frontLine.map((soldier, idx) => {
            const isTargetable = isPlayerTurn && selectedAttackerIds.length > 0 && soldier !== null;
            const defenderDef = soldier ? calculateDefenderPower(soldier.card) : 0;
            const isWin = totalAttackerPower > defenderDef;
            const isTie = totalAttackerPower === defenderDef;

            return (
              <div
                key={`opp-slot-${idx}`}
                className={`battlefield-slot ${isTargetable ? 'is-targetable' : ''}`}
                onClick={() => isTargetable && onTargetDefender(idx)}
              >
                {soldier ? (
                  <CardView
                    card={soldier.card}
                    isTarget={isTargetable}
                    size="md"
                    hasSickness={soldier.card.rank !== 'J' && soldier.deployedTurn === currentTurn}
                  />
                ) : (
                  <div className="empty-slot-placeholder">
                    <span>ช่อง {idx + 1} ว่าง</span>
                  </div>
                )}
                {isTargetable && soldier && (
                  <div className="slot-attack-hover">
                    <div className="attack-hover-header">
                      <Swords size={12} />
                      <span>คลิกโจมตี</span>
                    </div>
                    <div className="attack-hover-comparison">
                      <span className="hover-stat atk">⚔️ {totalAttackerPower} ATK</span>
                      <span className="hover-vs">vs</span>
                      <span className="hover-stat def">🛡️ {defenderDef} DEF</span>
                    </div>
                    <div
                      className={`attack-hover-outcome ${
                        isWin ? 'outcome-win' : isTie ? 'outcome-tie' : 'outcome-lose'
                      }`}
                    >
                      {isWin
                        ? selectedAttackerCards.length === 2
                          ? 'ชนะ (ใบน้อยตาย)'
                          : 'ชนะ (ศัตรูตาย)'
                        : isTie
                        ? 'เสมอ (ตายคู่)'
                        : 'แพ้ (ฝ่ายเราตาย)'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Battlefield Divider / Clash Banner */}
      <div className="battlefield-divider">
        <div className="divider-line"></div>
        <div className="divider-emblem">
          <Swords size={20} />
          <span>สนามรบแนวหน้า</span>
        </div>
        <div className="divider-line"></div>
      </div>

      {/* Player Frontline (3 Slots) */}
      <div className="frontline-row player-frontline">
        <div className="frontline-label">แนวหน้าของคุณ</div>
        <div className="slots-grid">
          {player.frontLine.map((soldier, idx) => {
            const isEmpty = soldier === null;
            const canDeployHere = isPlayerTurn && isDeploying && isEmpty && player.actionPoints > 0;
            const isSelected = soldier ? selectedAttackerIds.includes(soldier.card.id) : false;
            const isReady =
              soldier && isPlayerTurn && canSoldierAttack(soldier, currentTurn);

            return (
              <div
                key={`player-slot-${idx}`}
                className={`battlefield-slot ${canDeployHere ? 'can-deploy' : ''} ${
                  isSelected ? 'selected-slot' : ''
                }`}
                onClick={() => {
                  if (canDeployHere) {
                    onDeployToSlot(idx);
                  } else if (soldier && (isReady || isSelected)) {
                    onSelectAttacker(soldier);
                  }
                }}
              >
                {soldier ? (
                  <CardView
                    card={soldier.card}
                    size="md"
                    isSelected={isSelected}
                    canAttack={Boolean(isReady && !isSelected)}
                    hasSickness={soldier.card.rank !== 'J' && soldier.deployedTurn === currentTurn}
                    badgeText={isSelected ? '🗡️ เลือกแล้ว' : undefined}
                  />
                ) : (
                  <div className={`empty-slot-placeholder ${canDeployHere ? 'highlight-deploy' : ''}`}>
                    {canDeployHere ? (
                      <>
                        <Plus size={20} />
                        <span>วางลงช่องนี้</span>
                      </>
                    ) : (
                      <span>ช่อง {idx + 1} ว่าง</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
