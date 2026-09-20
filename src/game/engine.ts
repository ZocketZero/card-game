import type {
  Card,
  CardRole,
  CombatResult,
  GameAction,
  GameState,
  PlayerId,
  PlayerState,
  Rank,
  Soldier,
  Suit,
} from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function getRankPower(rank: Rank): number {
  switch (rank) {
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    case '10': return 10;
    case 'J': return 11;
    case 'Q': return 0;
    case 'K': return 0;
    case 'A': return 0;
  }
}

export function getCardRole(rank: Rank): CardRole {
  if (rank === 'Q') return 'advisor';
  if (rank === 'A') return 'weapon';
  if (rank === 'K') return 'king';
  return 'soldier';
}

export function createDeck(owner: PlayerId): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${owner}-${suit}-${rank}-${Math.random().toString(36).substring(2, 7)}`,
        owner,
        suit,
        rank,
        basePower: getRankPower(rank),
        role: getCardRole(rank),
      });
    }
  }
  return cards;
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function initPlayer(
  id: PlayerId,
  name: string,
  chosenKingSuit: Suit = id === 'p1' ? 'spades' : 'hearts'
): PlayerState {
  const fullDeck = createDeck(id);
  const kingIndex = fullDeck.findIndex((c) => c.rank === 'K' && c.suit === chosenKingSuit);
  const king = fullDeck.splice(kingIndex, 1)[0];

  const shuffledDeck = shuffle(fullDeck);
  // 3 cards under King as shields
  const shields = shuffledDeck.splice(0, 3);
  // 5 cards for starting hand
  const hand = shuffledDeck.splice(0, 5);

  return {
    id,
    name,
    king,
    shields,
    hasHolyShield: false,
    hand,
    deck: shuffledDeck,
    graveyard: [],
    frontLine: [null, null, null],
    actionPoints: 2,
  };
}

export function initGame(
  p1Name = 'Player 1',
  p2Name = 'Player 2',
  p1KingSuit: Suit = 'spades',
  p2KingSuit: Suit = 'hearts'
): GameState {
  const p1 = initPlayer('p1', p1Name, p1KingSuit);
  const p2 = initPlayer('p2', p2Name, p2KingSuit);

  return {
    turn: 1,
    activePlayer: 'p1',
    phase: 'action',
    players: { p1, p2 },
    winner: null,
    winReason: null,
    combatLog: ['เริ่มการประลอง The Sovereign’s Duel! ราชาทั้งสองพร้อมรบ'],
    lastCombatResult: null,
  };
}

export function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === 'p1' ? 'p2' : 'p1';
}

export function calculateAttackerPower(card: Card, targetIsKing = false, isBypass = false): number {
  if (targetIsKing && isBypass && card.suit === 'spades') {
    // ♠️ Spades: attack divided by 2 rounded down
    return Math.floor(card.basePower / 2);
  }
  let power = card.basePower;
  if (card.suit === 'clubs') {
    power += 2; // ♣️ Clubs: ATK + 2
  }
  return power;
}

export function calculateDefenderPower(card: Card): number {
  let power = card.basePower;
  if (card.suit === 'hearts') {
    power += 2; // ❤️ Hearts: DEF + 2
  }
  return power;
}

export function canSoldierAttack(soldier: Soldier, currentTurn: number): boolean {
  if (soldier.hasAttackedThisTurn) return false;
  // Jack can attack in the turn deployed
  if (soldier.card.rank === 'J') return true;
  // Others must wait 1 turn
  return soldier.deployedTurn < currentTurn;
}

export function hasFrontLineSoldiers(player: PlayerState): boolean {
  return player.frontLine.some((slot) => slot !== null);
}

export function executeAction(state: GameState, action: GameAction): GameState {
  if (state.winner) {
    return state;
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const activePlayer = newState.players[action.playerId];
  const opponent = newState.players[getOpponentId(action.playerId)];

  if (state.activePlayer !== action.playerId && action.type !== 'END_TURN') {
    return state; // Not your turn
  }

  switch (action.type) {
    case 'DEPLOY_SOLDIER': {
      if (state.phase !== 'action') return state;
      if (activePlayer.actionPoints <= 0) return state;
      if (action.slotIndex < 0 || action.slotIndex > 2) return state;
      if (activePlayer.frontLine[action.slotIndex] !== null) return state;

      const cardIndex = activePlayer.hand.findIndex((c) => c.id === action.cardId);
      if (cardIndex === -1) return state;
      const card = activePlayer.hand[cardIndex];

      if (card.role !== 'soldier') return state; // Only 2-10 and J

      activePlayer.hand.splice(cardIndex, 1);
      activePlayer.frontLine[action.slotIndex] = {
        card,
        deployedTurn: newState.turn,
        hasAttackedThisTurn: false,
      };
      activePlayer.actionPoints -= 1;

      newState.combatLog.unshift(
        `${activePlayer.name} วางทหาร [${card.rank}${getSuitIcon(card.suit)}] ในแนวหน้าช่องที่ ${
          action.slotIndex + 1
        }`
      );
      return newState;
    }

    case 'USE_ABILITY': {
      if (state.phase !== 'action') return state;
      const cardIndex = activePlayer.hand.findIndex((c) => c.id === action.cardId);
      if (cardIndex === -1) return state;
      const card = activePlayer.hand[cardIndex];

      // Verify ability is allowed for this card
      if (card.role === 'soldier') return state;
      if (card.role === 'advisor' && !['supply', 'revive', 'heal'].includes(action.ability)) return state;
      if (card.role === 'weapon' && !['destroy', 'holy_shield'].includes(action.ability)) return state;
      if (
        card.role === 'king' &&
        !['supply', 'revive', 'heal', 'destroy', 'holy_shield'].includes(action.ability)
      ) {
        return state;
      }

      // Validate ability execution preconditions
      if (action.ability === 'supply') {
        if (activePlayer.deck.length === 0) return state;
      } else if (action.ability === 'revive') {
        if (!action.targetGraveyardCardId) return state;
        const targetInGrave = activePlayer.graveyard.find((c) => c.id === action.targetGraveyardCardId);
        if (!targetInGrave || targetInGrave.role !== 'soldier') return state;
      } else if (action.ability === 'heal') {
        if (activePlayer.shields.length >= 3 || activePlayer.deck.length === 0) return state;
      } else if (action.ability === 'destroy') {
        if (
          action.targetEnemySlotIndex === undefined ||
          action.targetEnemySlotIndex < 0 ||
          action.targetEnemySlotIndex > 2 ||
          opponent.frontLine[action.targetEnemySlotIndex] === null
        ) {
          return state;
        }
      } else if (action.ability === 'holy_shield') {
        if (activePlayer.hasHolyShield) return state;
      }

      // Discard ability card to graveyard
      activePlayer.hand.splice(cardIndex, 1);
      activePlayer.graveyard.push(card);

      let desc = '';
      if (action.ability === 'supply') {
        // Draw 2 cards
        const drawn1 = activePlayer.deck.shift();
        const drawn2 = activePlayer.deck.shift();
        if (drawn1) activePlayer.hand.push(drawn1);
        if (drawn2) activePlayer.hand.push(drawn2);
        desc = `${activePlayer.name} ใช้ [${card.rank}${getSuitIcon(card.suit)}] เบิกเสบียง: จั่วไพ่เพิ่ม 2 ใบ`;
      } else if (action.ability === 'revive') {
        // Revive 1 soldier from graveyard
        const gIndex = activePlayer.graveyard.findIndex((c) => c.id === action.targetGraveyardCardId);
        if (gIndex !== -1 && activePlayer.graveyard[gIndex].role === 'soldier') {
          const revived = activePlayer.graveyard.splice(gIndex, 1)[0];
          activePlayer.hand.push(revived);
          desc = `${activePlayer.name} ใช้ [${card.rank}${getSuitIcon(card.suit)}] ชุบชีวิต: ดึง [${
            revived.rank
          }${getSuitIcon(revived.suit)}] กลับขึ้นมือ`;
        }
      } else if (action.ability === 'heal') {
        // Heal 1 shield under King (max 3)
        const healCard = activePlayer.deck.shift()!;
        activePlayer.shields.push(healCard);
        desc = `${activePlayer.name} ใช้ [${card.rank}${getSuitIcon(card.suit)}] เยียวยา: เพิ่มเกราะชีวิตใต้ King เป็น ${activePlayer.shields.length} ใบ`;
      } else if (action.ability === 'destroy') {
        // Destroy 1 enemy soldier on front line
        const destroyed = opponent.frontLine[action.targetEnemySlotIndex!]!.card;
        opponent.frontLine[action.targetEnemySlotIndex!] = null;
        opponent.graveyard.push(destroyed);
        desc = `${activePlayer.name} ใช้ [${card.rank}${getSuitIcon(card.suit)}] ทำลาย: ทำลาย [${
          destroyed.rank
        }${getSuitIcon(destroyed.suit)}] ของศัตรูทันที!`;
      } else if (action.ability === 'holy_shield') {
        activePlayer.hasHolyShield = true;
        desc = `${activePlayer.name} ใช้ [${card.rank}${getSuitIcon(card.suit)}] โล่ศักดิ์สิทธิ์: กางบาเรียป้องกันการโจมตีใส่ King 1 ครั้ง!`;
      }

      newState.combatLog.unshift(desc);
      return newState;
    }

    case 'ENTER_ATTACK_PHASE': {
      if (state.phase !== 'action') return state;
      newState.phase = 'attack';
      newState.combatLog.unshift(`⚔️ ${activePlayer.name} เข้าสู่ระยะโจมตี (Attack Step)`);
      return newState;
    }

    case 'ATTACK_SOLDIER': {
      if (state.phase !== 'attack') return state;
      if (action.targetSlotIndex < 0 || action.targetSlotIndex > 2) return state;
      const targetSoldier = opponent.frontLine[action.targetSlotIndex];
      if (!targetSoldier) return state;

      // Prevent duplicate card IDs in attacker list
      const uniqueAttackerIds = Array.from(new Set(action.attackerCardIds));
      if (
        uniqueAttackerIds.length === 0 ||
        uniqueAttackerIds.length > 2 ||
        uniqueAttackerIds.length !== action.attackerCardIds.length
      ) {
        return state;
      }

      // Find attacker soldiers
      const attackerSoldiers: { soldier: Soldier; slotIdx: number }[] = [];
      for (const cardId of uniqueAttackerIds) {
        for (let i = 0; i < 3; i++) {
          const s = activePlayer.frontLine[i];
          if (s && s.card.id === cardId) {
            attackerSoldiers.push({ soldier: s, slotIdx: i });
          }
        }
      }

      if (attackerSoldiers.length !== uniqueAttackerIds.length) return state;

      // Validate all attackers can attack
      for (const { soldier } of attackerSoldiers) {
        if (!canSoldierAttack(soldier, newState.turn)) return state;
      }

      const isCombo = attackerSoldiers.length === 2;
      const attackerCards = attackerSoldiers.map((a) => a.soldier.card);
      const defenderCard = targetSoldier.card;

      let totalAtk = 0;
      for (const card of attackerCards) {
        totalAtk += calculateAttackerPower(card, false, false);
      }
      const totalDef = calculateDefenderPower(defenderCard);

      const destroyedAttackerCardIds: string[] = [];
      let destroyedDefenderCard = false;
      let attackerDiamondBonusTriggered = false;
      let defenderDiamondBonusTriggered = false;

      if (totalAtk > totalDef) {
        // Attacker wins: Defender destroyed
        destroyedDefenderCard = true;
        opponent.frontLine[action.targetSlotIndex] = null;
        opponent.graveyard.push(defenderCard);

        // Diamond bonus check: draw 1 card for attacker
        if (attackerCards.some((c) => c.suit === 'diamonds')) {
          attackerDiamondBonusTriggered = true;
          const drawn = activePlayer.deck.shift();
          if (drawn) activePlayer.hand.push(drawn);
        }

        // In combo: card with lowest power among the 2 is destroyed
        if (isCombo) {
          const p0 = calculateAttackerPower(attackerCards[0]);
          const p1 = calculateAttackerPower(attackerCards[1]);
          const lowerIdx = p0 <= p1 ? 0 : 1;
          const lowerCard = attackerCards[lowerIdx];
          const lowerSlot = attackerSoldiers[lowerIdx].slotIdx;

          destroyedAttackerCardIds.push(lowerCard.id);
          activePlayer.frontLine[lowerSlot] = null;
          activePlayer.graveyard.push(lowerCard);
        }
      } else if (totalAtk < totalDef) {
        // Attacker loses: All participating attackers are destroyed
        for (const { soldier, slotIdx } of attackerSoldiers) {
          destroyedAttackerCardIds.push(soldier.card.id);
          activePlayer.frontLine[slotIdx] = null;
          activePlayer.graveyard.push(soldier.card);
        }

        // Diamond bonus check: Defender killed enemy, draw 1 card
        if (defenderCard.suit === 'diamonds') {
          defenderDiamondBonusTriggered = true;
          const drawn = opponent.deck.shift();
          if (drawn) opponent.hand.push(drawn);
        }
      } else {
        // Tie: both sides destroyed
        destroyedDefenderCard = true;
        opponent.frontLine[action.targetSlotIndex] = null;
        opponent.graveyard.push(defenderCard);

        for (const { soldier, slotIdx } of attackerSoldiers) {
          destroyedAttackerCardIds.push(soldier.card.id);
          activePlayer.frontLine[slotIdx] = null;
          activePlayer.graveyard.push(soldier.card);
        }

        // Diamond bonus check on tie for any side with diamonds
        if (attackerCards.some((c) => c.suit === 'diamonds')) {
          attackerDiamondBonusTriggered = true;
          const drawn = activePlayer.deck.shift();
          if (drawn) activePlayer.hand.push(drawn);
        }
        if (defenderCard.suit === 'diamonds') {
          defenderDiamondBonusTriggered = true;
          const drawn = opponent.deck.shift();
          if (drawn) opponent.hand.push(drawn);
        }
      }

      // Mark surviving attackers as having attacked
      for (const { soldier } of attackerSoldiers) {
        if (!destroyedAttackerCardIds.includes(soldier.card.id)) {
          soldier.hasAttackedThisTurn = true;
        }
      }

      let bonusLog = '';
      if (attackerDiamondBonusTriggered) bonusLog += ` [♦️ ${activePlayer.name} ได้จั่วไพ่ 1 ใบ]`;
      if (defenderDiamondBonusTriggered) bonusLog += ` [♦️ ${opponent.name} ได้จั่วไพ่ 1 ใบ]`;

      const logMsg = `⚔️ ${activePlayer.name} ${isCombo ? 'คอมโบ' : 'ส่ง'} [${attackerCards
        .map((c) => `${c.rank}${getSuitIcon(c.suit)}`)
        .join(' + ')}] (ATK ${totalAtk}) โจมตี [${defenderCard.rank}${getSuitIcon(
        defenderCard.suit
      )}] (DEF ${totalDef}) -> ${
        totalAtk > totalDef
          ? 'เป้าหมายถูกทำลาย!'
          : totalAtk < totalDef
          ? 'การโจมตีล้มเหลว ฝ่ายโจมตีถูกทำลาย!'
          : 'เสมอ! ทั้งสองฝ่ายถูกทำลาย!'
      }${bonusLog}`;

      newState.combatLog.unshift(logMsg);

      const combatResult: CombatResult = {
        attackerPlayer: activePlayer.id,
        defenderPlayer: opponent.id,
        isCombo,
        attackerCards,
        defenderCard,
        targetIsKing: false,
        totalAtk,
        totalDef,
        destroyedAttackerCardIds,
        destroyedDefenderCard,
        kingDamageDealt: 0,
        holyShieldBlocked: false,
        diamondBonusTriggered: attackerDiamondBonusTriggered || defenderDiamondBonusTriggered,
        description: logMsg,
      };
      newState.lastCombatResult = combatResult;

      return newState;
    }

    case 'ATTACK_KING': {
      if (state.phase !== 'attack') return state;
      // Prevent duplicate card IDs in attacker list
      const uniqueAttackerIds = Array.from(new Set(action.attackerCardIds));
      if (
        uniqueAttackerIds.length === 0 ||
        uniqueAttackerIds.length > 2 ||
        uniqueAttackerIds.length !== action.attackerCardIds.length
      ) {
        return state;
      }

      // Find attacker soldiers
      const attackerSoldiers: { soldier: Soldier; slotIdx: number }[] = [];
      for (const cardId of uniqueAttackerIds) {
        for (let i = 0; i < 3; i++) {
          const s = activePlayer.frontLine[i];
          if (s && s.card.id === cardId) {
            attackerSoldiers.push({ soldier: s, slotIdx: i });
          }
        }
      }

      if (attackerSoldiers.length !== uniqueAttackerIds.length) return state;

      // Validate attackers can attack
      for (const { soldier } of attackerSoldiers) {
        if (!canSoldierAttack(soldier, newState.turn)) return state;
      }

      const enemyHasGuards = hasFrontLineSoldiers(opponent);
      const isSpadesBypass = attackerSoldiers.every((a) => a.soldier.card.suit === 'spades');

      // Rule: cannot attack King if enemy has soldiers in front line, UNLESS Spades bypass
      if (enemyHasGuards && !isSpadesBypass) {
        return state; // Blocked by front line guard
      }

      const isCombo = attackerSoldiers.length === 2;
      const attackerCards = attackerSoldiers.map((a) => a.soldier.card);

      let totalAtk = 0;
      for (const card of attackerCards) {
        totalAtk += calculateAttackerPower(card, true, enemyHasGuards && isSpadesBypass);
      }

      let holyShieldBlocked = false;
      let kingDamageDealt = 0;
      let victory = false;

      // Check Holy Shield
      if (opponent.hasHolyShield) {
        opponent.hasHolyShield = false;
        holyShieldBlocked = true;
        newState.combatLog.unshift(
          `🛡️ โล่ศักดิ์สิทธิ์ของ ${opponent.name} สลายตัวเพื่อดูดซับการโจมตีทั้งหมดไว้!`
        );
      } else {
        // King takes damage
        // Victory condition: "เมื่อผู้เล่นสามารถทำลาย 'เกราะชีวิต' ใต้ King ของฝ่ายตรงข้ามจนหมด และโจมตีซ้ำได้อีกครั้ง จะถือว่าเป็นผู้ชนะ"
        if (opponent.shields.length === 0) {
          // King already has no shields! direct hit ends the game!
          victory = true;
          newState.winner = activePlayer.id;
          newState.phase = 'game_over';
          newState.winReason = `${activePlayer.name} โจมตีสังหาร King ของ ${opponent.name} สำเร็จ!`;
          newState.combatLog.unshift(`👑🏆 ${newState.winReason}`);
        } else {
          // Determine shields to remove:
          // Rule: โจมตีด้วยพลัง 1-5 (หรือใช้ ♠️): ดึงไพ่ใต้ King ออก 1 ใบ
          //       โจมตีด้วยพลัง 6 ขึ้นไป: ดึงไพ่ใต้ King ออก 2 ใบ (ดาเมจรุนแรง)
          const hasSpade = attackerCards.some((c) => c.suit === 'spades');
          const damage = totalAtk >= 6 && !hasSpade ? 2 : 1;
          const actualDamage = Math.min(damage, opponent.shields.length);
          kingDamageDealt = actualDamage;

          for (let i = 0; i < actualDamage; i++) {
            const removedShield = opponent.shields.pop();
            if (removedShield) opponent.graveyard.push(removedShield);
          }

          newState.combatLog.unshift(
            `💥 ${activePlayer.name} โจมตี King ของ ${opponent.name} (พลัง ${totalAtk})! ทำลายเกราะชีวิตไป ${actualDamage} ใบ (เหลือ ${opponent.shields.length} ใบ)`
          );
        }
      }

      const destroyedAttackerCardIds: string[] = [];

      // Spades bypass rule: "เมื่อตีเสร็จต้องทิ้งไพ่ใบนี้ลงกองขยะทันที"
      if (enemyHasGuards && isSpadesBypass) {
        for (const { soldier, slotIdx } of attackerSoldiers) {
          destroyedAttackerCardIds.push(soldier.card.id);
          activePlayer.frontLine[slotIdx] = null;
          activePlayer.graveyard.push(soldier.card);
        }
      } else if (isCombo) {
        // In combo, lowest power is destroyed
        const p0 = calculateAttackerPower(attackerCards[0]);
        const p1 = calculateAttackerPower(attackerCards[1]);
        const lowerIdx = p0 <= p1 ? 0 : 1;
        const lowerCard = attackerCards[lowerIdx];
        const lowerSlot = attackerSoldiers[lowerIdx].slotIdx;

        destroyedAttackerCardIds.push(lowerCard.id);
        activePlayer.frontLine[lowerSlot] = null;
        activePlayer.graveyard.push(lowerCard);
      }

      // Mark surviving attackers as having attacked
      for (const { soldier } of attackerSoldiers) {
        if (!destroyedAttackerCardIds.includes(soldier.card.id)) {
          soldier.hasAttackedThisTurn = true;
        }
      }

      const combatResult: CombatResult = {
        attackerPlayer: activePlayer.id,
        defenderPlayer: opponent.id,
        isCombo,
        attackerCards,
        defenderCard: null,
        targetIsKing: true,
        totalAtk,
        totalDef: 0,
        destroyedAttackerCardIds,
        destroyedDefenderCard: victory,
        kingDamageDealt,
        holyShieldBlocked,
        diamondBonusTriggered: false,
        description: `โจมตี King ศัตรู (พลัง ${totalAtk})`,
      };
      newState.lastCombatResult = combatResult;

      return newState;
    }

    case 'END_TURN': {
      const nextPlayerId = getOpponentId(activePlayer.id);
      const nextPlayer = newState.players[nextPlayerId];

      newState.turn += 1;
      newState.activePlayer = nextPlayerId;
      newState.phase = 'action';
      newState.lastCombatResult = null;

      // Reset action points & attack flags for next player
      nextPlayer.actionPoints = 2;
      for (const slot of nextPlayer.frontLine) {
        if (slot) {
          slot.hasAttackedThisTurn = false;
        }
      }

      // Draw Phase: draw 1 card automatically
      if (nextPlayer.deck.length > 0) {
        const drawn = nextPlayer.deck.shift()!;
        nextPlayer.hand.push(drawn);
        newState.combatLog.unshift(
          `เทิร์นที่ ${newState.turn}: ${nextPlayer.name} เริ่มเทิร์นและจั่วการ์ด 1 ใบ (2 Action Points)`
        );
      } else {
        newState.combatLog.unshift(
          `เทิร์นที่ ${newState.turn}: ${nextPlayer.name} เริ่มเทิร์น (กองจั่วหมดแล้ว) (2 Action Points)`
        );
      }

      return newState;
    }
  }

  return newState;
}

export function getSuitIcon(suit: Suit): string {
  switch (suit) {
    case 'spades': return '♠️';
    case 'hearts': return '♥️';
    case 'clubs': return '♣️';
    case 'diamonds': return '♦️';
  }
}

export function getSuitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#ef4444' : '#1e293b';
}
