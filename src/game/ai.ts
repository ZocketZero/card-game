import { hasFrontLineSoldiers } from './engine';
import type { GameAction, GameState } from './types';

export function getAIMove(state: GameState): GameAction | null {
  if (state.activePlayer !== 'p2' || state.winner) {
    return null;
  }

  const ai = state.players.p2;
  const human = state.players.p1;

  // Phase 1: Action Phase (Deploy soldiers & use abilities)
  if (state.phase === 'action') {
    // Play abilities or deploy soldiers if AP available
    if (ai.actionPoints > 0) {
      const queenOrKing = ai.hand.find((c) => c.rank === 'Q' || c.rank === 'K');
      const aceOrKing = ai.hand.find((c) => c.rank === 'A' || c.rank === 'K');

      // Destroy enemy soldier if available
      const enemyWithSoldier = human.frontLine.findIndex((s) => s !== null);
      if (enemyWithSoldier !== -1 && aceOrKing) {
        return {
          type: 'USE_ABILITY',
          playerId: 'p2',
          cardId: aceOrKing.id,
          ability: 'destroy',
          targetEnemySlotIndex: enemyWithSoldier,
        };
      }

      // Heal if HP is damaged
      if (ai.shields.length < 3 && ai.deck.length > 0 && queenOrKing) {
        return {
          type: 'USE_ABILITY',
          playerId: 'p2',
          cardId: queenOrKing.id,
          ability: 'heal',
        };
      }

      // Holy shield if not protected
      if (!ai.hasHolyShield && aceOrKing) {
        return {
          type: 'USE_ABILITY',
          playerId: 'p2',
          cardId: aceOrKing.id,
          ability: 'holy_shield',
        };
      }

      // Revive if high-power soldier is in graveyard
      const soldierInGraveyard = ai.graveyard.find((c) => c.role === 'soldier');
      if (soldierInGraveyard && queenOrKing) {
        return {
          type: 'USE_ABILITY',
          playerId: 'p2',
          cardId: queenOrKing.id,
          ability: 'revive',
          targetGraveyardCardId: soldierInGraveyard.id,
        };
      }

      // Supply to draw cards
      if (ai.deck.length > 0 && queenOrKing) {
        return {
          type: 'USE_ABILITY',
          playerId: 'p2',
          cardId: queenOrKing.id,
          ability: 'supply',
        };
      }

      // Deploy soldiers if slots available
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
    }

    // Finished planning/deploying: enter attack phase
    return { type: 'ENTER_ATTACK_PHASE', playerId: 'p2' };
  }

  // Phase 2: Attack Phase (Order ready soldiers to attack)
  if (state.phase === 'attack') {
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

      // Attack human soldiers if we have an advantage
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

    // No further attacks to make: end turn
    return { type: 'END_TURN', playerId: 'p2' };
  }

  return null;
}
