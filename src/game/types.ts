export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardRole = 'soldier' | 'advisor' | 'weapon' | 'king';
export type PlayerId = 'p1' | 'p2';

export interface Card {
  id: string;
  owner: PlayerId;
  suit: Suit;
  rank: Rank;
  basePower: number;
  role: CardRole;
}

export interface Soldier {
  card: Card;
  deployedTurn: number;
  hasAttackedThisTurn: boolean;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  king: Card;
  shields: Card[]; // Cards tucked under King (HP)
  hasHolyShield: boolean; // Ace ability buff
  hand: Card[];
  deck: Card[];
  graveyard: Card[];
  frontLine: (Soldier | null)[]; // Max 3 slots
  actionPoints: number; // 2 AP per turn
}

export interface CombatResult {
  attackerPlayer: PlayerId;
  defenderPlayer: PlayerId;
  isCombo: boolean;
  attackerCards: Card[];
  defenderCard: Card | null; // null if attacking King
  targetIsKing: boolean;
  totalAtk: number;
  totalDef: number;
  destroyedAttackerCardIds: string[];
  destroyedDefenderCard: boolean;
  kingDamageDealt: number;
  holyShieldBlocked: boolean;
  diamondBonusTriggered: boolean;
  description: string;
}

export interface GameState {
  turn: number;
  activePlayer: PlayerId;
  phase: 'draw' | 'action' | 'attack' | 'end' | 'game_over';
  players: {
    p1: PlayerState;
    p2: PlayerState;
  };
  winner: PlayerId | null;
  winReason: string | null;
  combatLog: string[];
  lastCombatResult: CombatResult | null;
}

export type AbilityChoice = 'supply' | 'revive' | 'heal' | 'destroy' | 'holy_shield';

export type GameAction =
  | { type: 'DEPLOY_SOLDIER'; playerId: PlayerId; cardId: string; slotIndex: number }
  | {
      type: 'USE_ABILITY';
      playerId: PlayerId;
      cardId: string;
      ability: AbilityChoice;
      targetEnemySlotIndex?: number;
      targetGraveyardCardId?: string;
    }
  | { type: 'ENTER_ATTACK_PHASE'; playerId: PlayerId }
  | {
      type: 'ATTACK_SOLDIER';
      playerId: PlayerId;
      attackerCardIds: string[]; // 1 or 2 cards (combo)
      targetSlotIndex: number;
    }
  | {
      type: 'ATTACK_KING';
      playerId: PlayerId;
      attackerCardIds: string[]; // 1 or 2 cards
    }
  | { type: 'END_TURN'; playerId: PlayerId };
