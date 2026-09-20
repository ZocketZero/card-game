import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type {
  AbilityChoice,
  Card,
  GameAction,
  GameState,
  PlayerId,
  Soldier,
  Suit,
} from './game/types';
import {
  initGame,
  executeAction,
  calculateAttackerPower,
  hasFrontLineSoldiers,
  getSuitIcon,
} from './game/engine';
import { getAIMove } from './game/ai';
import { sounds } from './game/sound';
import { P2PNetwork, ManualWebRTC } from './network/p2p';
import type { NetworkMessage } from './network/p2p';
import { HomePage } from './components/HomePage';
import { CardView } from './components/CardView';
import { KingZone } from './components/KingZone';
import { Battlefield } from './components/Battlefield';
import { ActionControls } from './components/ActionControls';
import { AbilityModal } from './components/AbilityModal';
import { GraveyardModal } from './components/GraveyardModal';
import { RulebookModal } from './components/RulebookModal';
import { CombatLogModal } from './components/CombatLogModal';
import { LobbyModal } from './components/LobbyModal';
import type { GameMode } from './components/LobbyModal';
import { Crown, RotateCcw, Home } from 'lucide-react';
import './App.css';

export function App() {
  const initialRoom = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') : null;

  // View state: 'home' or 'game'
  const [currentView, setCurrentView] = useState<'home' | 'game'>(() => (initialRoom ? 'game' : 'home'));

  // Player Customization State
  const [playerName, setPlayerName] = useState<string>('แม่ทัพ');
  const [playerKingSuit, setPlayerKingSuit] = useState<Suit>('spades');

  // Game State
  const [gameState, setGameState] = useState<GameState>(() =>
    initGame('ผู้เล่น 1 (Host)', 'ผู้เล่น 2 (Guest)', 'spades', 'hearts')
  );
  const [gameMode, setGameMode] = useState<GameMode>(() => (initialRoom ? 'online_p2p' : 'vs_ai'));
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId>(() => (initialRoom ? 'p2' : 'p1'));

  // Network State
  const [roomCode, setRoomCode] = useState<string>(() => initialRoom || '');
  const [isNetworkHost, setIsNetworkHost] = useState<boolean>(() => !initialRoom);
  const [isP2PConnected, setIsP2PConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  // UI Selection State
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedAttackerIds, setSelectedAttackerIds] = useState<string[]>([]);
  const [activeAbilityCard, setActiveAbilityCard] = useState<Card | null>(null);

  // Modals
  const [showLobby, setShowLobby] = useState<boolean>(() => Boolean(initialRoom));
  const [showRulebook, setShowRulebook] = useState<boolean>(false);
  const [showCombatLog, setShowCombatLog] = useState<boolean>(false);
  const [graveyardModalData, setGraveyardModalData] = useState<{
    isOpen: boolean;
    title: string;
    cards: Card[];
    isReviveMode: boolean;
    abilityCard?: Card;
  }>({
    isOpen: false,
    title: '',
    cards: [],
    isReviveMode: false,
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);

  // P2P Refs
  const p2pRef = useRef<P2PNetwork | null>(null);
  const manualRtcRef = useRef<ManualWebRTC | null>(null);

  // Apply Game Action
  const applyAction = useCallback((action: GameAction, broadcast = true) => {
    // Sound FX
    if (action.type === 'DEPLOY_SOLDIER') sounds.playCardPlay();
    else if (action.type === 'ATTACK_SOLDIER' || action.type === 'ATTACK_KING') sounds.playAttack();
    else if (action.type === 'USE_ABILITY') {
      if (action.ability === 'heal') sounds.playHeal();
      else if (action.ability === 'holy_shield') sounds.playShieldBlock();
      else if (action.ability === 'destroy') sounds.playDestroy();
      else sounds.playCardPlay();
    }

    setGameState((prevState) => {
      const nextState = executeAction(prevState, action);

      // Broadcast if multiplayer
      if (broadcast) {
        if (p2pRef.current?.isConnected()) {
          p2pRef.current.sendMessage({ type: 'ACTION', action });
        } else if (manualRtcRef.current?.isConnected()) {
          manualRtcRef.current.sendMessage({ type: 'ACTION', action });
        }
      }

      return nextState;
    });

    // Reset selection state
    setSelectedHandCardId(null);
    setSelectedAttackerIds([]);
  }, []);

  const restartGame = useCallback((broadcast = true) => {
    setGameState((prev) => {
      const newState = initGame(
        prev.players.p1.name,
        prev.players.p2.name,
        prev.players.p1.king.suit,
        prev.players.p2.king.suit
      );
      if (broadcast) {
        if (p2pRef.current?.isConnected()) {
          p2pRef.current.sendMessage({ type: 'RESTART' });
        } else if (manualRtcRef.current?.isConnected()) {
          manualRtcRef.current.sendMessage({ type: 'RESTART' });
        }
      }
      return newState;
    });
    setSelectedHandCardId(null);
    setSelectedAttackerIds([]);
  }, []);

  // Handle incoming network messages
  const handleNetworkMessage = useCallback((msg: NetworkMessage) => {
    if (msg.type === 'ACTION') {
      applyAction(msg.action, false);
    } else if (msg.type === 'FULL_SYNC') {
      setGameState(msg.state);
    } else if (msg.type === 'RESTART') {
      restartGame(false);
    }
  }, [applyAction, restartGame]);

  // Setup PeerJS network
  const initP2P = useCallback(() => {
    if (p2pRef.current) p2pRef.current.cleanup();

    const net = new P2PNetwork({
      onConnected: (peerId) => {
        setIsP2PConnected(true);
        setConnectionStatus(`เชื่อมต่อกับผู้เล่นแล้ว (${peerId.substring(0, 8)}...)`);
        setShowLobby(false);
      },
      onDisconnected: () => {
        setIsP2PConnected(false);
        setConnectionStatus('การเชื่อมต่อหลุด');
      },
      onMessage: handleNetworkMessage,
      onError: (err) => {
        setConnectionStatus(`ข้อผิดพลาด: ${err}`);
      },
      onRoomCreated: (code) => {
        setRoomCode(code);
        setConnectionStatus('ห้องถูกสร้างแล้ว รอเพื่อนเข้าร่วม...');
      },
    });

    p2pRef.current = net;
    return net;
  }, [handleNetworkMessage]);

  // Join online room
  const handleJoinOnlineRoom = useCallback((code: string) => {
    setGameMode('online_p2p');
    setLocalPlayerId('p2');
    setIsNetworkHost(false);
    const net = initP2P();
    net.joinRoom(code);
    setConnectionStatus(`กำลังเชื่อมต่อไปยังห้อง ${code}...`);
  }, [initP2P]);

  // Auto connect if room query parameter exists
  useEffect(() => {
    if (initialRoom) {
      const timer = setTimeout(() => {
        handleJoinOnlineRoom(initialRoom);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialRoom, handleJoinOnlineRoom]);

  // AI Turn Handler
  useEffect(() => {
    if (currentView !== 'game' || gameMode !== 'vs_ai') return;
    if (gameState.activePlayer !== 'p2' || gameState.winner) return;

    const timer = setTimeout(() => {
      const aiAction = getAIMove(gameState);
      if (aiAction) {
        applyAction(aiAction, false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [gameState, gameMode, currentView, applyAction]);

  // Victory Confetti Effect
  useEffect(() => {
    if (currentView === 'game' && gameState.winner) {
      sounds.playVictory();
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [gameState.winner, currentView]);

  // Start Playing vs AI
  const handleStartVsAI = () => {
    const pName = playerName.trim() || 'คุณ (แม่ทัพ)';
    setGameMode('vs_ai');
    setLocalPlayerId('p1');
    setGameState(initGame(pName, 'บอทอัจฉริยะ (AI)', playerKingSuit, 'hearts'));
    setCurrentView('game');
    setShowLobby(false);
  };

  // Start Creating Room
  const handleCreateOnlineRoom = (customCode?: string) => {
    const pName = playerName.trim() || 'ผู้เล่น 1 (Host)';
    setGameMode('online_p2p');
    setLocalPlayerId('p1');
    setIsNetworkHost(true);
    setGameState(initGame(pName, 'ผู้เล่น 2 (Guest)', playerKingSuit, 'hearts'));
    const net = initP2P();
    net.createRoom(customCode);
    setCurrentView('game');
    setShowLobby(true);
  };

  // Start Joining Room
  const handleStartJoinRoom = (code: string) => {
    const pName = playerName.trim() || 'ผู้เล่น 2 (Guest)';
    setGameMode('online_p2p');
    setLocalPlayerId('p2');
    setIsNetworkHost(false);
    setGameState(initGame('ผู้เล่น 1 (Host)', pName, 'spades', playerKingSuit));
    handleJoinOnlineRoom(code);
    setCurrentView('game');
    setShowLobby(true);
  };

  // Start Pass & Play
  const handleStartPassAndPlay = () => {
    const pName = playerName.trim() || 'ผู้เล่น 1 (สีน้ำเงิน)';
    setGameMode('pass_and_play');
    setLocalPlayerId('p1');
    setGameState(initGame(pName, 'ผู้เล่น 2 (สีแดง)', playerKingSuit, 'hearts'));
    setCurrentView('game');
    setShowLobby(false);
  };

  // Start LAN Mode
  const handleStartLanMode = () => {
    setGameMode('offline_sdp');
    setCurrentView('game');
    setShowLobby(true);
  };

  // Manual SDP Handshake Handlers
  const handleCreateSdpOffer = async (): Promise<string> => {
    setGameMode('offline_sdp');
    setLocalPlayerId('p1');
    setIsNetworkHost(true);
    if (manualRtcRef.current) manualRtcRef.current.cleanup();

    const rtc = new ManualWebRTC(
      handleNetworkMessage,
      () => {
        setIsP2PConnected(true);
        setConnectionStatus('เชื่อมต่อผ่าน LAN สำเร็จ!');
        setShowLobby(false);
      },
      () => {
        setIsP2PConnected(false);
        setConnectionStatus('ตัดการเชื่อมต่อ LAN');
      }
    );
    manualRtcRef.current = rtc;
    return await rtc.createOffer();
  };

  const handleAcceptSdpOfferAndGetAnswer = async (offer: string): Promise<string> => {
    setGameMode('offline_sdp');
    setLocalPlayerId('p2');
    setIsNetworkHost(false);
    if (manualRtcRef.current) manualRtcRef.current.cleanup();

    const rtc = new ManualWebRTC(
      handleNetworkMessage,
      () => {
        setIsP2PConnected(true);
        setConnectionStatus('เชื่อมต่อผ่าน LAN สำเร็จ!');
        setShowLobby(false);
      },
      () => {
        setIsP2PConnected(false);
        setConnectionStatus('ตัดการเชื่อมต่อ LAN');
      }
    );
    manualRtcRef.current = rtc;
    return await rtc.acceptOfferAndCreateAnswer(offer);
  };

  const handleAcceptSdpAnswer = async (answer: string): Promise<void> => {
    if (manualRtcRef.current) {
      await manualRtcRef.current.acceptAnswer(answer);
    }
  };

  // Current active player perspective
  const effectivePlayerId: PlayerId =
    gameMode === 'pass_and_play' ? gameState.activePlayer : localPlayerId;
  const isMyTurn = gameState.activePlayer === effectivePlayerId && !gameState.winner;

  const activePlayerState = gameState.players[effectivePlayerId];
  const opponentPlayerId: PlayerId = effectivePlayerId === 'p1' ? 'p2' : 'p1';
  const opponentPlayerState = gameState.players[opponentPlayerId];

  // Selected hand card
  const selectedHandCard =
    activePlayerState.hand.find((c) => c.id === selectedHandCardId) || null;

  // Attacker soldier cards
  const selectedAttackerCards: Soldier[] = activePlayerState.frontLine.filter(
    (s): s is Soldier => s !== null && selectedAttackerIds.includes(s.card.id)
  );
  const selectedAttackerCardsNames = selectedAttackerCards.map(
    (s) => `${s.card.rank}${getSuitIcon(s.card.suit)}`
  );

  let totalAttackerPower = 0;
  for (const s of selectedAttackerCards) {
    totalAttackerPower += calculateAttackerPower(s.card, false, false);
  }

  // Hand card click
  const handleHandCardClick = (card: Card) => {
    if (!isMyTurn || activePlayerState.actionPoints <= 0) return;

    if (card.role === 'soldier') {
      if (selectedHandCardId === card.id) {
        setSelectedHandCardId(null);
      } else {
        setSelectedHandCardId(card.id);
        setSelectedAttackerIds([]);
      }
    } else {
      setSelectedHandCardId(null);
      setSelectedAttackerIds([]);
      setActiveAbilityCard(card);
    }
  };

  // Deploy soldier to empty slot
  const handleDeployToSlot = (slotIndex: number) => {
    if (!selectedHandCardId || !isMyTurn) return;
    applyAction({
      type: 'DEPLOY_SOLDIER',
      playerId: effectivePlayerId,
      cardId: selectedHandCardId,
      slotIndex,
    });
  };

  // Ability selection
  const handleSelectAbility = (ability: AbilityChoice, targetEnemySlot?: number) => {
    if (!activeAbilityCard) return;

    if (ability === 'revive') {
      setActiveAbilityCard(null);
      setGraveyardModalData({
        isOpen: true,
        title: 'เลือกทหารที่จะชุบชีวิต',
        cards: activePlayerState.graveyard,
        isReviveMode: true,
        abilityCard: activeAbilityCard,
      });
      return;
    }

    applyAction({
      type: 'USE_ABILITY',
      playerId: effectivePlayerId,
      cardId: activeAbilityCard.id,
      ability,
      targetEnemySlotIndex: targetEnemySlot,
    });
    setActiveAbilityCard(null);
  };

  // Select soldier to revive from graveyard
  const handleSelectReviveCard = (card: Card) => {
    if (!graveyardModalData.abilityCard) return;
    applyAction({
      type: 'USE_ABILITY',
      playerId: effectivePlayerId,
      cardId: graveyardModalData.abilityCard.id,
      ability: 'revive',
      targetGraveyardCardId: card.id,
    });
    setGraveyardModalData({ isOpen: false, title: '', cards: [], isReviveMode: false });
  };

  // Frontline soldier selection (for attack or combo)
  const handleSelectAttacker = (soldier: Soldier) => {
    if (!isMyTurn || activePlayerState.actionPoints <= 0) return;
    setSelectedHandCardId(null);

    const cardId = soldier.card.id;
    if (selectedAttackerIds.includes(cardId)) {
      setSelectedAttackerIds(selectedAttackerIds.filter((id) => id !== cardId));
    } else {
      if (selectedAttackerIds.length >= 2) {
        setSelectedAttackerIds([cardId]);
      } else {
        setSelectedAttackerIds([...selectedAttackerIds, cardId]);
      }
    }
  };

  // Target enemy soldier
  const handleTargetDefender = (targetSlotIndex: number) => {
    if (selectedAttackerIds.length === 0 || !isMyTurn) return;

    applyAction({
      type: 'ATTACK_SOLDIER',
      playerId: effectivePlayerId,
      attackerCardIds: selectedAttackerIds,
      targetSlotIndex,
    });
  };

  // Target enemy King
  const enemyHasGuards = hasFrontLineSoldiers(opponentPlayerState);
  const allAttackingAreSpades =
    selectedAttackerCards.length > 0 &&
    selectedAttackerCards.every((s) => s.card.suit === 'spades');
  const canTargetKing =
    isMyTurn &&
    selectedAttackerIds.length > 0 &&
    (!enemyHasGuards || allAttackingAreSpades);

  const handleTargetKing = () => {
    if (!canTargetKing) return;

    applyAction({
      type: 'ATTACK_KING',
      playerId: effectivePlayerId,
      attackerCardIds: selectedAttackerIds,
    });
  };

  // End turn
  const handleEndTurn = () => {
    if (!isMyTurn) return;
    applyAction({
      type: 'END_TURN',
      playerId: effectivePlayerId,
    });
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  return (
    <div className="game-app-wrapper">
      {/* VIEW 1: HOMEPAGE */}
      {currentView === 'home' ? (
        <HomePage
          playerName={playerName}
          onPlayerNameChange={setPlayerName}
          playerKingSuit={playerKingSuit}
          onPlayerKingSuitChange={setPlayerKingSuit}
          onPlayVsAI={handleStartVsAI}
          onCreateRoom={() => handleCreateOnlineRoom()}
          onJoinRoom={handleStartJoinRoom}
          onPassAndPlay={handleStartPassAndPlay}
          onOpenLanMode={handleStartLanMode}
          onOpenRulebook={() => setShowRulebook(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      ) : (
        /* VIEW 2: GAME BOARD TABLE */
        <>
          {/* Top Header */}
          <header className="game-header-bar">
            <div className="brand-section">
              <button
                className="back-home-btn"
                onClick={() => setCurrentView('home')}
                title="กลับหน้าหลัก"
              >
                <Home size={16} />
                <span>หน้าหลัก</span>
              </button>
              <Crown className="king-crown-icon" size={24} />
              <span className="game-title-text">The Sovereign’s Duel (ศึกชิงบัลลังก์เดือด)</span>
            </div>

            <div className="match-info-badge">
              <span className="match-turn-tag">เทิร์นที่ {gameState.turn}</span>
              <span>•</span>
              <span>
                {gameMode === 'vs_ai'
                  ? 'โหมดสู้ AI บอท'
                  : gameMode === 'pass_and_play'
                  ? 'โหมดเล่นเครื่องเดียว'
                  : `ห้องออนไลน์: ${roomCode || 'P2P'}`}
              </span>
              {(gameMode === 'online_p2p' || gameMode === 'offline_sdp') && (
                <>
                  <span>•</span>
                  <span className={`status-dot ${isP2PConnected ? 'connected' : 'waiting'}`} />
                  <span>{isP2PConnected ? 'เชื่อมต่อแล้ว' : 'รอเชื่อมต่อ'}</span>
                </>
              )}
            </div>
          </header>

          {/* Main Board Table */}
          <main className="game-table-container">
            {/* Opponent Area (Top) */}
            <section className="opponent-stage-area">
              <div className="opponent-hand-cluster">
                <div className="pile-badge">
                  <div
                    className="pile-card-box"
                    onClick={() =>
                      setGraveyardModalData({
                        isOpen: true,
                        title: `สุสานของ ${opponentPlayerState.name}`,
                        cards: opponentPlayerState.graveyard,
                        isReviveMode: false,
                      })
                    }
                  >
                    🪦 {opponentPlayerState.graveyard.length}
                  </div>
                  <span>สุสานศัตรู</span>
                </div>
                <div className="pile-badge" style={{ marginLeft: '10px' }}>
                  <div className="pile-card-box">🃏 {opponentPlayerState.deck.length}</div>
                  <span>กองจั่ว</span>
                </div>
                {/* Hidden opponent hand cards */}
                <div style={{ display: 'flex', gap: '4px', marginLeft: '14px' }}>
                  {opponentPlayerState.hand.map((_, i) => (
                    <CardView key={`opp-hand-${i}`} isFaceDown={true} size="sm" />
                  ))}
                </div>
              </div>

              {/* Opponent King & Shields */}
              <KingZone
                player={opponentPlayerState}
                isCurrentPlayer={false}
                canTargetKing={canTargetKing}
                onTargetKing={handleTargetKing}
              />
            </section>

            {/* Center Battlefield */}
            <Battlefield
              opponent={opponentPlayerState}
              player={activePlayerState}
              currentTurn={gameState.turn}
              isPlayerTurn={isMyTurn}
              selectedAttackerIds={selectedAttackerIds}
              selectedHandCard={selectedHandCard}
              onSelectAttacker={handleSelectAttacker}
              onTargetDefender={handleTargetDefender}
              onDeployToSlot={handleDeployToSlot}
            />

            {/* Player Stage Area (Bottom) */}
            <section className="player-stage-area">
              <div className="player-dock-row">
                {/* Player King & Shields */}
                <KingZone player={activePlayerState} isCurrentPlayer={true} />

                {/* Player Hand Cards */}
                <div className="player-hand-scroll">
                  {activePlayerState.hand.map((card) => {
                    const isSelected = selectedHandCardId === card.id;
                    const isPlayable = isMyTurn && activePlayerState.actionPoints > 0;

                    return (
                      <CardView
                        key={card.id}
                        card={card}
                        size="md"
                        isSelected={isSelected}
                        isPlayable={isPlayable}
                        onClick={() => handleHandCardClick(card)}
                      />
                    );
                  })}
                </div>

                {/* Player Deck & Graveyard Piles */}
                <div className="deck-graveyard-cluster">
                  <div className="pile-badge">
                    <div className="pile-card-box">🃏 {activePlayerState.deck.length}</div>
                    <span>กองจั่ว</span>
                  </div>
                  <div className="pile-badge">
                    <div
                      className="pile-card-box"
                      onClick={() =>
                        setGraveyardModalData({
                          isOpen: true,
                          title: 'สุสานของคุณ',
                          cards: activePlayerState.graveyard,
                          isReviveMode: false,
                        })
                      }
                    >
                      🪦 {activePlayerState.graveyard.length}
                    </div>
                    <span>สุสานคุณ</span>
                  </div>
                </div>
              </div>

              {/* Action Points, End Turn & Quick Tool Bar */}
              <ActionControls
                player={activePlayerState}
                isPlayerTurn={isMyTurn}
                selectedAttackerIds={selectedAttackerIds}
                selectedAttackerCardsNames={selectedAttackerCardsNames}
                totalAttackerPower={totalAttackerPower}
                onClearAttackerSelection={() => setSelectedAttackerIds([])}
                onEndTurn={handleEndTurn}
                onOpenRulebook={() => setShowRulebook(true)}
                onOpenCombatLog={() => setShowCombatLog(true)}
                onOpenGraveyard={() =>
                  setGraveyardModalData({
                    isOpen: true,
                    title: 'สุสานของคุณ',
                    cards: activePlayerState.graveyard,
                    isReviveMode: false,
                  })
                }
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onOpenLobby={() => setShowLobby(true)}
              />
            </section>
          </main>
        </>
      )}

      {/* MODALS */}

      {/* Ability Choice Modal (Queen, Ace, King) */}
      {activeAbilityCard && (
        <AbilityModal
          card={activeAbilityCard}
          player={activePlayerState}
          opponent={opponentPlayerState}
          onSelectAbility={handleSelectAbility}
          onClose={() => setActiveAbilityCard(null)}
        />
      )}

      {/* Graveyard Viewer / Revive Modal */}
      {graveyardModalData.isOpen && (
        <GraveyardModal
          cards={graveyardModalData.cards}
          title={graveyardModalData.title}
          isReviveMode={graveyardModalData.isReviveMode}
          onSelectReviveCard={handleSelectReviveCard}
          onClose={() =>
            setGraveyardModalData({ isOpen: false, title: '', cards: [], isReviveMode: false })
          }
        />
      )}

      {/* Rulebook Modal */}
      {showRulebook && <RulebookModal onClose={() => setShowRulebook(false)} />}

      {/* Combat Log Modal */}
      {showCombatLog && (
        <CombatLogModal logs={gameState.combatLog} onClose={() => setShowCombatLog(false)} />
      )}

      {/* Lobby / Connection Modal */}
      {showLobby && (
        <LobbyModal
          currentMode={gameMode}
          roomCode={roomCode}
          isHost={isNetworkHost}
          isConnected={isP2PConnected}
          connectionStatus={connectionStatus}
          onCreateOnlineRoom={handleCreateOnlineRoom}
          onJoinOnlineRoom={handleJoinOnlineRoom}
          onCreateSdpOffer={handleCreateSdpOffer}
          onAcceptSdpOfferAndGetAnswer={handleAcceptSdpOfferAndGetAnswer}
          onAcceptSdpAnswer={handleAcceptSdpAnswer}
          onStartVsAI={handleStartVsAI}
          onStartPassAndPlay={handleStartPassAndPlay}
          onClose={() => setShowLobby(false)}
        />
      )}

      {/* Game Over / Victory Overlay */}
      {gameState.winner && (
        <div className="victory-overlay">
          <Crown size={80} className="victory-trophy" />
          <h2 className="victory-title">
            {gameState.winner === effectivePlayerId ? 'ชัยชนะเป็นของคุณ!' : 'คุณพ่ายแพ้ในศึกครั้งนี้'}
          </h2>
          <p className="victory-desc">{gameState.winReason}</p>
          <div style={{ display: 'flex', gap: '14px' }}>
            <button className="rematch-btn" onClick={() => restartGame(true)}>
              <RotateCcw size={20} />
              <span>เริ่มศึกใหม่ (Rematch)</span>
            </button>
            <button
              className="rematch-btn"
              style={{ background: 'rgba(255, 255, 255, 0.15)', boxShadow: 'none' }}
              onClick={() => setCurrentView('home')}
            >
              <Home size={20} />
              <span>กลับหน้าหลัก</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
