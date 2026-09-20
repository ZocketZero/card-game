import { hasFrontLineSoldiers } from './engine';
import type { GameAction, GameState } from './types';

export function getAIMove(state: GameState): GameAction | null {
  if (state.activePlayer !== 'p2' || state.winner || state.players.p2.actionPoints <= 0) {
    return { type: 'END_TURN', playerId: 'p2' };
  }

  const ai = state.players.p2;
  const human = state.players.p1;

  // 1. If enemy King has 0 shields and we can attack King, do it immediately for victory!
  const readySoldiers = ai.frontLine
    .map((s, idx) => ({ soldier: s, idx }))
    .filter(
      ({ soldier }) =>
        soldier &&
        !soldier.hasAttackedThisTurn &&
        (soldier.card.rank === 'J' || soldier.deployedTurn < state.turn)
    );

  const humanHasGuards = hasFrontLineSoldiers(human);

  if (readySoldiers.length > 0) {
    // Check if any can attack King
    const spadeSoldiers = readySoldiers.filter((s) => s.soldier!.card.suit === 'spades');

    // If human has no guards, or we have spades, attack King!
    if (!humanHasGuards) {
      const bestAttacker = readySoldiers.reduce((max, curr) =>
        curr.soldier!.card.basePower > max.soldier!.card.basePower ? curr : max
      );
      return {
        type: 'ATTACK_KING',
        playerId: 'p2',
        attackerCardIds: [bestAttacker.soldier!.card.id],
      };
    } else if (spadeSoldiers.length > 0) {
      // Use Spades to bypass
      return {
        type: 'ATTACK_KING',
        playerId: 'p2',
        attackerCardIds: [spadeSoldiers[0].soldier!.card.id],
      };
    }

    // 2. Attack human soldiers if we have an advantage
    const humanSoldierSlots = human.frontLine
      .map((s, idx) => ({ soldier: s, idx }))
      .filter(({ soldier }) => soldier !== null);

    if (humanSoldierSlots.length > 0) {
      for (const ready of readySoldiers) {
        const atkPower =
          ready.soldier!.card.basePower + (ready.soldier!.card.suit === 'clubs' ? 2 : 0);
        for (const enemy of humanSoldierSlots) {
          const defPower =
            enemy.soldier!.card.basePower + (enemy.soldier!.card.suit === 'hearts' ? 2 : 0);
          if (atkPower >= defPower) {
            return {
              type: 'ATTACK_SOLDIER',
              playerId: 'p2',
              attackerCardIds: [ready.soldier!.card.id],
              targetSlotIndex: enemy.idx,
            };
          }
        }
      }
    }
  }

  // 3. Play abilities if useful
  const queenCard = ai.hand.find((c) => c.rank === 'Q');
  if (queenCard) {
    if (ai.shields.length < 3 && ai.deck.length > 0) {
      return {
        type: 'USE_ABILITY',
        playerId: 'p2',
        cardId: queenCard.id,
        ability: 'heal',
      };
    }
    return {
      type: 'USE_ABILITY',
      playerId: 'p2',
      cardId: queenCard.id,
      ability: 'supply',
    };
  }

  const aceCard = ai.hand.find((c) => c.rank === 'A');
  if (aceCard) {
    const enemyWithSoldier = human.frontLine.findIndex((s) => s !== null);
    if (enemyWithSoldier !== -1) {
      return {
        type: 'USE_ABILITY',
        playerId: 'p2',
        cardId: aceCard.id,
        ability: 'destroy',
        targetEnemySlotIndex: enemyWithSoldier,
      };
    }
    if (!ai.hasHolyShield) {
      return {
        type: 'USE_ABILITY',
        playerId: 'p2',
        cardId: aceCard.id,
        ability: 'holy_shield',
      };
    }
  }

  // 4. Deploy soldiers if slots available
  const emptySlotIdx = ai.frontLine.findIndex((slot) => slot === null);
  if (emptySlotIdx !== -1) {
    const deployableSoldier = ai.hand
      .filter((c) => c.role === 'soldier')
      .sort((a, b) => b.basePower - a.basePower)[0];

    if (deployableSoldier) {
      return {
        type: 'DEPLOY_SOLDIER',
        playerId: 'p2',
        cardId: deployableSoldier.id,
        slotIndex: emptySlotIdx,
      };
    }
  }

  // Otherwise end turn
  return { type: 'END_TURN', playerId: 'p2' };
}
