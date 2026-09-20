import { describe, it, expect } from 'vitest';
import {
  initGame,
  executeAction,
  calculateAttackerPower,
  calculateDefenderPower,
  canSoldierAttack,
} from './engine';
import type { Card, Soldier } from './types';

describe('The Sovereign’s Duel Game Engine', () => {
  it('initializes game with correct card counts and zones', () => {
    const state = initGame('Alice', 'Bob');
    expect(state.turn).toBe(1);
    expect(state.activePlayer).toBe('p1');
    expect(state.phase).toBe('action');

    const p1 = state.players.p1;
    const p2 = state.players.p2;

    expect(p1.king.rank).toBe('K');
    expect(p2.king.rank).toBe('K');

    expect(p1.shields.length).toBe(3);
    expect(p2.shields.length).toBe(3);

    expect(p1.hand.length).toBe(5);
    expect(p2.hand.length).toBe(5);

    // 52 cards total: 1 King + 3 Shields + 5 Hand + 43 Deck = 52
    expect(p1.deck.length).toBe(43);
    expect(p2.deck.length).toBe(43);

    expect(p1.actionPoints).toBe(2);
    expect(p1.frontLine).toEqual([null, null, null]);
  });

  it('calculates suit bonuses properly', () => {
    const clubSoldier: Card = {
      id: 'c1',
      owner: 'p1',
      suit: 'clubs',
      rank: '6',
      basePower: 6,
      role: 'soldier',
    };
    const heartSoldier: Card = {
      id: 'h1',
      owner: 'p2',
      suit: 'hearts',
      rank: '6',
      basePower: 6,
      role: 'soldier',
    };
    const spadeSoldier: Card = {
      id: 's1',
      owner: 'p1',
      suit: 'spades',
      rank: '9',
      basePower: 9,
      role: 'soldier',
    };

    // Clubs +2 ATK
    expect(calculateAttackerPower(clubSoldier, false, false)).toBe(8);
    // Hearts +2 DEF
    expect(calculateDefenderPower(heartSoldier)).toBe(8);
    // Spades bypass against King: floor(9 / 2) = 4
    expect(calculateAttackerPower(spadeSoldier, true, true)).toBe(4);
  });

  it('allows Jack to attack on deploy turn, while standard soldiers wait', () => {
    const jackSoldier: Soldier = {
      card: { id: 'j1', owner: 'p1', suit: 'spades', rank: 'J', basePower: 11, role: 'soldier' },
      deployedTurn: 1,
      hasAttackedThisTurn: false,
    };
    const normalSoldier: Soldier = {
      card: { id: 'n1', owner: 'p1', suit: 'clubs', rank: '5', basePower: 5, role: 'soldier' },
      deployedTurn: 1,
      hasAttackedThisTurn: false,
    };

    // On turn 1:
    expect(canSoldierAttack(jackSoldier, 1)).toBe(true);
    expect(canSoldierAttack(normalSoldier, 1)).toBe(false);

    // On turn 3 (next P1 turn):
    expect(canSoldierAttack(normalSoldier, 3)).toBe(true);
  });

  it('deploys a soldier to front line and consumes 1 AP', () => {
    let state = initGame();
    const soldierCard: Card = {
      id: 's-test',
      owner: 'p1',
      suit: 'diamonds',
      rank: '8',
      basePower: 8,
      role: 'soldier',
    };
    state.players.p1.hand = [soldierCard];

    state = executeAction(state, {
      type: 'DEPLOY_SOLDIER',
      playerId: 'p1',
      cardId: 's-test',
      slotIndex: 0,
    });

    expect(state.players.p1.actionPoints).toBe(1);
    expect(state.players.p1.hand.length).toBe(0);
    expect(state.players.p1.frontLine[0]?.card.id).toBe('s-test');
    expect(state.players.p1.frontLine[0]?.deployedTurn).toBe(1);
  });

  it('resolves combat clash and triggers Diamond bonus draw', () => {
    let state = initGame();
    // Setup attacker: Diamond 7 (power 7) ready to attack
    state.players.p1.frontLine[0] = {
      card: { id: 'atk1', owner: 'p1', suit: 'diamonds', rank: '7', basePower: 7, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    // Setup defender: Spade 5 (power 5)
    state.players.p2.frontLine[1] = {
      card: { id: 'def1', owner: 'p2', suit: 'spades', rank: '5', basePower: 5, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    const initialHandCount = state.players.p1.hand.length;

    // Attacking in action phase should be rejected
    const rejectedState = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
      targetSlotIndex: 1,
    });
    expect(rejectedState).toBe(state);

    // Enter attack phase
    state = executeAction(state, {
      type: 'ENTER_ATTACK_PHASE',
      playerId: 'p1',
    });
    expect(state.phase).toBe('attack');

    state = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
      targetSlotIndex: 1,
    });

    // Defender destroyed
    expect(state.players.p2.frontLine[1]).toBeNull();
    expect(state.players.p2.graveyard.some((c) => c.id === 'def1')).toBe(true);

    // Diamond bonus gave 1 card
    expect(state.players.p1.hand.length).toBe(initialHandCount + 1);
    // Attacks do not consume action points
    expect(state.players.p1.actionPoints).toBe(2);
  });

  it('resolves combo attack: combines power and destroys lower card', () => {
    let state = initGame();
    state.phase = 'attack';
    // 2 attackers: 3 of Hearts (3 ATK) and 4 of Clubs (4 + 2 = 6 ATK). Total = 9 ATK.
    state.players.p1.frontLine[0] = {
      card: { id: 'c1', owner: 'p1', suit: 'hearts', rank: '3', basePower: 3, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    state.players.p1.frontLine[1] = {
      card: { id: 'c2', owner: 'p1', suit: 'clubs', rank: '4', basePower: 4, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    // Defender: 8 of Spades (8 DEF)
    state.players.p2.frontLine[0] = {
      card: { id: 'def1', owner: 'p2', suit: 'spades', rank: '8', basePower: 8, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    state = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['c1', 'c2'],
      targetSlotIndex: 0,
    });

    // Defender with 8 DEF defeated by 9 ATK!
    expect(state.players.p2.frontLine[0]).toBeNull();

    // Attacker with lower power (c1 with power 3 vs c2 with power 6) is destroyed per combo rule
    expect(state.players.p1.frontLine[0]).toBeNull();
    expect(state.players.p1.frontLine[1]?.card.id).toBe('c2');
  });

  it('blocks attack with Holy Shield and consumes shield', () => {
    let state = initGame();
    state.phase = 'attack';
    state.players.p2.hasHolyShield = true;
    state.players.p2.frontLine = [null, null, null]; // Empty front line
    state.players.p1.frontLine[0] = {
      card: { id: 'atk1', owner: 'p1', suit: 'clubs', rank: '10', basePower: 10, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    state = executeAction(state, {
      type: 'ATTACK_KING',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
    });

    // Holy shield blocked! Shields count still 3
    expect(state.players.p2.shields.length).toBe(3);
    expect(state.players.p2.hasHolyShield).toBe(false);
  });

  it('reduces King shields and triggers victory when 0 shields and hit again', () => {
    let state = initGame();
    state.phase = 'attack';
    state.players.p2.shields = [
      { id: 's1', owner: 'p2', suit: 'clubs', rank: '2', basePower: 2, role: 'soldier' },
    ];
    state.players.p2.frontLine = [null, null, null];
    state.players.p1.frontLine[0] = {
      card: { id: 'atk1', owner: 'p1', suit: 'clubs', rank: '5', basePower: 5, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    // Attack: destroys last shield
    state = executeAction(state, {
      type: 'ATTACK_KING',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
    });

    expect(state.players.p2.shields.length).toBe(0);
    expect(state.winner).toBeNull();

    // Reset attacker for next attack when 0 shields
    state.players.p1.actionPoints = 1;
    state.players.p1.frontLine[0]!.hasAttackedThisTurn = false;

    state = executeAction(state, {
      type: 'ATTACK_KING',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
    });

    // Struck when 0 shields -> WINNER!
    expect(state.winner).toBe('p1');
    expect(state.phase).toBe('game_over');
  });

  it('allows Queen abilities: supply, revive, heal', () => {
    let state = initGame();
    // Test Queen supply: draw 2 cards
    const queenCard: Card = {
      id: 'q1',
      owner: 'p1',
      suit: 'hearts',
      rank: 'Q',
      basePower: 0,
      role: 'advisor',
    };
    state.players.p1.hand = [queenCard];
    const initialDeckCount = state.players.p1.deck.length;

    state = executeAction(state, {
      type: 'USE_ABILITY',
      playerId: 'p1',
      cardId: 'q1',
      ability: 'supply',
    });

    // Hand had 1 (Q), discarded Q, drew 2 -> hand count is 2
    expect(state.players.p1.hand.length).toBe(2);
    expect(state.players.p1.deck.length).toBe(initialDeckCount - 2);
    expect(state.players.p1.actionPoints).toBe(2);
  });

  it('triggers Diamond bonus for defender when killing the attacker', () => {
    let state = initGame();
    state.phase = 'attack';
    // Attacker: Clubs 3 (power 3 + 2 = 5)
    state.players.p1.frontLine[0] = {
      card: { id: 'atk1', owner: 'p1', suit: 'clubs', rank: '3', basePower: 3, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    // Defender: Diamonds 7 (power 7 DEF)
    state.players.p2.frontLine[0] = {
      card: { id: 'def1', owner: 'p2', suit: 'diamonds', rank: '7', basePower: 7, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    const initialP2HandCount = state.players.p2.hand.length;

    state = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
      targetSlotIndex: 0,
    });

    // Attacker defeated
    expect(state.players.p1.frontLine[0]).toBeNull();
    // Defender survives
    expect(state.players.p2.frontLine[0]?.card.id).toBe('def1');
    // P2 with Diamonds drew 1 card
    expect(state.players.p2.hand.length).toBe(initialP2HandCount + 1);
  });

  it('destroys all combo attackers when combo attack fails against higher defender power', () => {
    let state = initGame();
    state.phase = 'attack';
    // 2 attackers: 2 of Spades (2) + 3 of Clubs (5) = total 7 ATK
    state.players.p1.frontLine[0] = {
      card: { id: 'atk1', owner: 'p1', suit: 'spades', rank: '2', basePower: 2, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    state.players.p1.frontLine[1] = {
      card: { id: 'atk2', owner: 'p1', suit: 'clubs', rank: '3', basePower: 3, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    // Defender: 10 of Hearts (10 + 2 = 12 DEF)
    state.players.p2.frontLine[0] = {
      card: { id: 'def1', owner: 'p2', suit: 'hearts', rank: '10', basePower: 10, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    state = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['atk1', 'atk2'],
      targetSlotIndex: 0,
    });

    // Both combo attackers should be destroyed on failure
    expect(state.players.p1.frontLine[0]).toBeNull();
    expect(state.players.p1.frontLine[1]).toBeNull();
    expect(state.players.p2.frontLine[0]?.card.id).toBe('def1');
  });

  it('caps Spades attack damage to King at 1 shield even when power >= 6', () => {
    let state = initGame();
    state.phase = 'attack';
    state.players.p2.frontLine = [null, null, null]; // Empty front line
    state.players.p2.shields = [
      { id: 's1', owner: 'p2', suit: 'hearts', rank: '2', basePower: 2, role: 'soldier' },
      { id: 's2', owner: 'p2', suit: 'hearts', rank: '3', basePower: 3, role: 'soldier' },
      { id: 's3', owner: 'p2', suit: 'hearts', rank: '4', basePower: 4, role: 'soldier' },
    ];
    // Attacker: 8 of Spades (power 8)
    state.players.p1.frontLine[0] = {
      card: { id: 'spade8', owner: 'p1', suit: 'spades', rank: '8', basePower: 8, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    state = executeAction(state, {
      type: 'ATTACK_KING',
      playerId: 'p1',
      attackerCardIds: ['spade8'],
    });

    // Spades can only deal 1 shield damage per rule (เหลือ 2 ใบ)
    expect(state.players.p2.shields.length).toBe(2);
  });

  it('deals 2 shield damage to King for non-Spades with power >= 6', () => {
    let state = initGame();
    state.phase = 'attack';
    state.players.p2.frontLine = [null, null, null]; // Empty front line
    state.players.p2.shields = [
      { id: 's1', owner: 'p2', suit: 'hearts', rank: '2', basePower: 2, role: 'soldier' },
      { id: 's2', owner: 'p2', suit: 'hearts', rank: '3', basePower: 3, role: 'soldier' },
      { id: 's3', owner: 'p2', suit: 'hearts', rank: '4', basePower: 4, role: 'soldier' },
    ];
    // Attacker: 8 of Clubs (power 8 + 2 = 10)
    state.players.p1.frontLine[0] = {
      card: { id: 'club8', owner: 'p1', suit: 'clubs', rank: '8', basePower: 8, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    state = executeAction(state, {
      type: 'ATTACK_KING',
      playerId: 'p1',
      attackerCardIds: ['club8'],
    });

    // 2 shields removed (เหลือ 1 ใบ)
    expect(state.players.p2.shields.length).toBe(1);
  });

  it('prevents duplicate card IDs in attack actions', () => {
    let state = initGame();
    state.phase = 'attack';
    state.players.p1.frontLine[0] = {
      card: { id: 'single1', owner: 'p1', suit: 'clubs', rank: '4', basePower: 4, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    state.players.p2.frontLine[0] = {
      card: { id: 'def1', owner: 'p2', suit: 'hearts', rank: '5', basePower: 5, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    const beforeState = state;
    // Attempt duplicate card ID exploit
    const nextState = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['single1', 'single1'],
      targetSlotIndex: 0,
    });

    // Action rejected, state unchanged
    expect(nextState).toBe(beforeState);
  });

  it('allows King in hand to be used for abilities with strict validation', () => {
    let state = initGame();
    // Hand has King of Diamonds
    const kingCard: Card = {
      id: 'k-dia',
      owner: 'p1',
      suit: 'diamonds',
      rank: 'K',
      basePower: 0,
      role: 'king',
    };
    state.players.p1.hand = [kingCard];
    state.players.p2.frontLine[1] = {
      card: { id: 'enemy1', owner: 'p2', suit: 'clubs', rank: '6', basePower: 6, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    // King used as Ace 'destroy'
    state = executeAction(state, {
      type: 'USE_ABILITY',
      playerId: 'p1',
      cardId: 'k-dia',
      ability: 'destroy',
      targetEnemySlotIndex: 1,
    });

    expect(state.players.p2.frontLine[1]).toBeNull();
    expect(state.players.p1.actionPoints).toBe(2);

    // Attempting invalid destroy on empty slot is rejected
    state.players.p1.hand = [{ id: 'k2', owner: 'p1', suit: 'clubs', rank: 'K', basePower: 0, role: 'king' }];
    const invalidResult = executeAction(state, {
      type: 'USE_ABILITY',
      playerId: 'p1',
      cardId: 'k2',
      ability: 'destroy',
      targetEnemySlotIndex: 1, // now empty!
    });
    expect(invalidResult).toBe(state);
  });

  it('does not consume or require action points for attacks', () => {
    let state = initGame();
    state.phase = 'attack';
    state.players.p1.actionPoints = 0; // 0 AP remaining
    state.players.p1.frontLine[0] = {
      card: { id: 'atk1', owner: 'p1', suit: 'hearts', rank: '8', basePower: 8, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    state.players.p2.frontLine[0] = {
      card: { id: 'def1', owner: 'p2', suit: 'hearts', rank: '4', basePower: 4, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };

    // Attack soldier with 0 AP
    state = executeAction(state, {
      type: 'ATTACK_SOLDIER',
      playerId: 'p1',
      attackerCardIds: ['atk1'],
      targetSlotIndex: 0,
    });

    expect(state.players.p2.frontLine[0]).toBeNull();
    expect(state.players.p1.actionPoints).toBe(0); // Still 0, not deducted
    expect(state.players.p1.frontLine[0]!.hasAttackedThisTurn).toBe(true);

    // Attack King with another soldier with 0 AP
    state.players.p1.frontLine[1] = {
      card: { id: 'atk2', owner: 'p1', suit: 'diamonds', rank: '6', basePower: 6, role: 'soldier' },
      deployedTurn: 0,
      hasAttackedThisTurn: false,
    };
    state.players.p2.shields = [
      { id: 'sh1', owner: 'p2', suit: 'hearts', rank: '2', basePower: 2, role: 'soldier' },
      { id: 'sh2', owner: 'p2', suit: 'hearts', rank: '3', basePower: 3, role: 'soldier' },
    ];

    state = executeAction(state, {
      type: 'ATTACK_KING',
      playerId: 'p1',
      attackerCardIds: ['atk2'],
    });

    expect(state.players.p2.shields.length).toBe(0); // 6 ATK deals 2 shields
    expect(state.players.p1.actionPoints).toBe(0); // Still 0
  });

  it('strictly prevents playing cards and skills in attack phase', () => {
    let state = initGame();
    const soldierCard: Card = {
      id: 'soldier-1',
      owner: 'p1',
      suit: 'hearts',
      rank: '7',
      basePower: 7,
      role: 'soldier',
    };
    const queenCard: Card = {
      id: 'queen-1',
      owner: 'p1',
      suit: 'diamonds',
      rank: 'Q',
      basePower: 0,
      role: 'advisor',
    };
    state.players.p1.hand = [soldierCard, queenCard];

    // Enter attack phase
    state = executeAction(state, {
      type: 'ENTER_ATTACK_PHASE',
      playerId: 'p1',
    });
    expect(state.phase).toBe('attack');

    // Attempt to deploy soldier in attack phase - MUST BE REJECTED
    const deployAttempt = executeAction(state, {
      type: 'DEPLOY_SOLDIER',
      playerId: 'p1',
      cardId: 'soldier-1',
      slotIndex: 0,
    });
    expect(deployAttempt).toBe(state);
    expect(deployAttempt.players.p1.frontLine[0]).toBeNull();
    expect(deployAttempt.players.p1.actionPoints).toBe(2);

    // Attempt to use ability in attack phase - MUST BE REJECTED
    const abilityAttempt = executeAction(state, {
      type: 'USE_ABILITY',
      playerId: 'p1',
      cardId: 'queen-1',
      ability: 'supply',
    });
    expect(abilityAttempt).toBe(state);
    expect(abilityAttempt.players.p1.hand.length).toBe(2);

    // End turn transitions to next player and resets phase to action
    state = executeAction(state, {
      type: 'END_TURN',
      playerId: 'p1',
    });
    expect(state.turn).toBe(2);
    expect(state.activePlayer).toBe('p2');
    expect(state.phase).toBe('action');
    expect(state.players.p2.actionPoints).toBe(2);
  });
});
