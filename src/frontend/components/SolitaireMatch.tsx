import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useElapsedTimer } from '../hooks/useElapsedTimer';
import {
  useUndoRedo,
  useUndoRedoKeyboard,
} from '../hooks/useUndoRedo';
import type { SolitaireProgress } from '../../types/progress';
import { formatDuration } from '../utils/time';
import { GameToolbar, GameToolbarButton } from './GameToolbar';

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'J',
  'Q',
  'K',
] as const;
const TABLEAU_COUNT = 7;

type Suit = (typeof SUITS)[number];
type Card = string;
type Outcome = SolitaireProgress['outcome'];
type TableauPile = SolitaireProgress['tableau'][number];
type Foundations = SolitaireProgress['foundations'];

type SelectedSource =
  | { type: 'waste' }
  | { type: 'tableau'; pileIndex: number; startIndex: number }
  | { type: 'foundation'; suit: Suit };

type Props = {
  saved?: SolitaireProgress;
  onWin: (elapsedMs: number, score?: number) => void;
  onProgressChange: (progress: SolitaireProgress) => void;
  onStartOver: () => void;
  onDevSkip?: () => void;
  devSkipBusy?: boolean;
};

function rankValue(card: Card): number {
  return RANKS.indexOf(card[0] as (typeof RANKS)[number]) + 1;
}

function suitOf(card: Card): Suit {
  return card[1] as Suit;
}

function cardColor(card: Card): 'red' | 'black' {
  const suit = suitOf(card);
  return suit === 'H' || suit === 'D' ? 'red' : 'black';
}

function rankLabel(card: Card): string {
  return card[0] === 'T' ? '10' : (card[0] ?? '');
}

function suitGlyph(suit: Suit): string {
  if (suit === 'H') return '♥';
  if (suit === 'D') return '♦';
  if (suit === 'C') return '♣';
  return '♠';
}

function CardFace({ card }: { card: Card }) {
  const rank = rankLabel(card);
  const suit = suitGlyph(suitOf(card));
  return (
    <span className="solitaire-card-face" aria-hidden="true">
      <span className="solitaire-corner top-left">
        <span className="solitaire-corner-rank">{rank}</span>
        <span className="solitaire-corner-suit">{suit}</span>
      </span>
      <span className="solitaire-card-pip">{suit}</span>
      <span className="solitaire-corner bottom-right">
        <span className="solitaire-corner-rank">{rank}</span>
        <span className="solitaire-corner-suit">{suit}</span>
      </span>
    </span>
  );
}

function makeDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => `${rank}${suit}`));
}

function shuffle(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function createInitialGame(): {
  tableau: TableauPile[];
  stock: Card[];
  waste: Card[];
  foundations: Foundations;
} {
  const deck = shuffle(makeDeck());
  const tableau = Array.from({ length: TABLEAU_COUNT }, () => ({
    down: [] as Card[],
    up: [] as Card[],
  }));

  for (let col = 0; col < TABLEAU_COUNT; col += 1) {
    for (let row = 0; row <= col; row += 1) {
      const card = deck.shift();
      if (!card) continue;
      if (row === col) tableau[col]!.up.push(card);
      else tableau[col]!.down.push(card);
    }
  }

  return {
    tableau,
    stock: deck,
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
  };
}

function isValidSaved(saved?: SolitaireProgress): boolean {
  if (!saved) return false;
  if (!Array.isArray(saved.tableau) || saved.tableau.length !== TABLEAU_COUNT)
    return false;
  if (!Array.isArray(saved.deck) || !Array.isArray(saved.waste)) return false;
  return Boolean(saved.foundations);
}

function foundationCanTake(foundations: Foundations, card: Card): boolean {
  const suit = suitOf(card);
  return rankValue(card) === foundations[suit].length + 1;
}

function tableauCanTake(target: TableauPile, card: Card): boolean {
  const top = target.up[target.up.length - 1];
  if (!top) return rankValue(card) === 13;
  return (
    cardColor(top) !== cardColor(card) && rankValue(top) === rankValue(card) + 1
  );
}

function maybeFlipTableauTop(pile: TableauPile): TableauPile {
  if (pile.up.length > 0 || pile.down.length === 0) return pile;
  const down = [...pile.down];
  const flipped = down.pop();
  return { down, up: flipped ? [flipped] : [] };
}

function totalFoundationCards(foundations: Foundations): number {
  return SUITS.reduce((total, suit) => total + foundations[suit].length, 0);
}

function selectedCards(
  selected: SelectedSource | null,
  tableau: TableauPile[],
  waste: Card[],
  foundations: Foundations
): Card[] {
  if (!selected) return [];
  if (selected.type === 'waste') {
    const top = waste[waste.length - 1];
    return top ? [top] : [];
  }
  if (selected.type === 'foundation') {
    const top = foundations[selected.suit].at(-1);
    return top ? [top] : [];
  }
  return tableau[selected.pileIndex]?.up.slice(selected.startIndex) ?? [];
}

type GameSnapshot = {
  tableau: TableauPile[];
  stock: Card[];
  waste: Card[];
  foundations: Foundations;
  moves: number;
};

const MAX_HISTORY = 100;

function cloneTableau(tableau: TableauPile[]): TableauPile[] {
  return tableau.map(pile => ({ down: [...pile.down], up: [...pile.up] }));
}

function cloneFoundations(foundations: Foundations): Foundations {
  return {
    S: [...foundations.S],
    H: [...foundations.H],
    D: [...foundations.D],
    C: [...foundations.C],
  };
}

function createSnapshot(
  tableau: TableauPile[],
  stock: Card[],
  waste: Card[],
  foundations: Foundations,
  moves: number
): GameSnapshot {
  return {
    tableau: cloneTableau(tableau),
    stock: [...stock],
    waste: [...waste],
    foundations: cloneFoundations(foundations),
    moves,
  };
}

export function SolitaireMatch({
  saved,
  onWin,
  onProgressChange,
  onStartOver,
  onDevSkip,
  devSkipBusy = false,
}: Props) {
  const initial = useMemo(() => createInitialGame(), []);
  const base = isValidSaved(saved)
    ? saved!
    : {
        tableau: initial.tableau,
        deck: initial.stock,
        waste: initial.waste,
        foundations: initial.foundations,
        startedAt: null,
        outcome: 'playing' as const,
        statusText: '',
        moves: 0,
      };

  const [tableau, setTableau] = useState<TableauPile[]>(() => base.tableau);
  const [stock, setStock] = useState<Card[]>(() => base.deck);
  const [waste, setWaste] = useState<Card[]>(() => base.waste);
  const [foundations, setFoundations] = useState<Foundations>(
    () => base.foundations
  );
  const [startedAt, setStartedAt] = useState<number | null>(
    base.startedAt ?? null
  );
  const [outcome, setOutcome] = useState<Outcome>(base.outcome ?? 'playing');
  const [statusText, setStatusText] = useState(base.statusText ?? '');
  const [moves, setMoves] = useState(base.moves ?? 0);
  const [selected, setSelected] = useState<SelectedSource | null>(null);
  const [frozenElapsedMs, setFrozenElapsedMs] = useState(0);
  const wonRef = useRef(false);

  const elapsedMs = useElapsedTimer({
    startedAt,
    frozenMs: frozenElapsedMs,
    isStopped: outcome !== 'playing',
  });

  useEffect(() => {
    onProgressChange({
      tableau,
      deck: stock,
      waste,
      foundations,
      startedAt,
      outcome,
      statusText,
      moves,
    });
  }, [
    tableau,
    stock,
    waste,
    foundations,
    startedAt,
    outcome,
    statusText,
    moves,
    onProgressChange,
  ]);

  const getSnapshot = useCallback(
    (): GameSnapshot =>
      createSnapshot(tableau, stock, waste, foundations, moves),
    [tableau, stock, waste, foundations, moves]
  );

  const applySnapshot = useCallback(
    (snapshot: GameSnapshot) => {
      setTableau(snapshot.tableau);
      setStock(snapshot.stock);
      setWaste(snapshot.waste);
      setFoundations(snapshot.foundations);
      setMoves(snapshot.moves);
      setSelected(null);
      setStatusText('');
      if (outcome === 'won') {
        wonRef.current = false;
        setOutcome('playing');
        setFrozenElapsedMs(0);
      }
    },
    [outcome]
  );

  const { pushHistory, undo, redo, canUndo, canRedo } = useUndoRedo(
    getSnapshot,
    applySnapshot,
    { enabled: outcome === 'playing', maxHistory: MAX_HISTORY }
  );

  useUndoRedoKeyboard(undo, redo, outcome === 'playing');

  const finishWin = useCallback(
    (start: number | null) => {
      if (wonRef.current) return;
      wonRef.current = true;
      const ms = Math.max(1, Date.now() - (start ?? Date.now()));
      setFrozenElapsedMs(ms);
      setOutcome('won');
      setStatusText('Victory! Generating your code...');
      onWin(ms, Math.max(1, 1000 - moves));
    },
    [moves, onWin]
  );

  useEffect(() => {
    if (totalFoundationCards(foundations) === 52) {
      finishWin(startedAt);
    }
  }, [foundations, finishWin, startedAt]);

  const markMove = useCallback(() => {
    pushHistory();
    if (!startedAt) setStartedAt(Date.now());
    setMoves(prev => prev + 1);
    setStatusText('');
  }, [pushHistory, startedAt]);

  const clearSelection = useCallback(() => setSelected(null), []);

  const moveToFoundation = useCallback(
    (source: SelectedSource, targetSuit: Suit): boolean => {
      if (outcome !== 'playing') return false;
      const cards = selectedCards(source, tableau, waste, foundations);
      if (cards.length !== 1) return false;
      const card = cards[0]!;
      if (suitOf(card) !== targetSuit) return false;
      if (!foundationCanTake(foundations, card)) return false;

      markMove();

      if (source.type === 'waste') {
        setWaste(prev => prev.slice(0, -1));
      } else if (source.type === 'foundation') {
        if (source.suit === targetSuit) return false;
        setFoundations(prev => ({
          ...prev,
          [source.suit]: prev[source.suit].slice(0, -1),
        }));
      } else {
        setTableau(prev => {
          const next = prev.map(p => ({ down: [...p.down], up: [...p.up] }));
          next[source.pileIndex]!.up = next[source.pileIndex]!.up.slice(
            0,
            source.startIndex
          );
          next[source.pileIndex] = maybeFlipTableauTop(next[source.pileIndex]!);
          return next;
        });
      }

      setFoundations(prev => ({
        ...prev,
        [targetSuit]: [...prev[targetSuit], card],
      }));
      clearSelection();
      return true;
    },
    [outcome, tableau, waste, foundations, markMove, clearSelection]
  );

  const moveToTableau = useCallback(
    (source: SelectedSource, targetIndex: number): boolean => {
      if (outcome !== 'playing') return false;
      const moving = selectedCards(source, tableau, waste, foundations);
      if (moving.length === 0) return false;
      if (source.type === 'tableau' && source.pileIndex === targetIndex)
        return false;
      const first = moving[0]!;
      const target = tableau[targetIndex];
      if (!target || !tableauCanTake(target, first)) return false;

      markMove();

      if (source.type === 'waste') {
        setWaste(prev => prev.slice(0, -1));
      } else if (source.type === 'foundation') {
        setFoundations(prev => ({
          ...prev,
          [source.suit]: prev[source.suit].slice(0, -1),
        }));
      } else {
        setTableau(prev => {
          const next = prev.map(p => ({ down: [...p.down], up: [...p.up] }));
          next[source.pileIndex]!.up = next[source.pileIndex]!.up.slice(
            0,
            source.startIndex
          );
          next[source.pileIndex] = maybeFlipTableauTop(next[source.pileIndex]!);
          return next;
        });
      }

      setTableau(prev => {
        const next = prev.map(p => ({ down: [...p.down], up: [...p.up] }));
        next[targetIndex]!.up.push(...moving);
        return next;
      });

      clearSelection();
      return true;
    },
    [outcome, tableau, waste, foundations, markMove, clearSelection]
  );

  const tryMoveSelectionToFoundation = useCallback(
    (targetSuit: Suit) => {
      if (!selected) return;
      moveToFoundation(selected, targetSuit);
    },
    [selected, moveToFoundation]
  );

  const tryMoveSelectionToTableau = useCallback(
    (targetIndex: number) => {
      if (!selected) return;
      moveToTableau(selected, targetIndex);
    },
    [selected, moveToTableau]
  );

  const dragSourceRef = useRef<SelectedSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<
    | { kind: 'foundation'; suit: Suit }
    | { kind: 'tableau'; pileIndex: number }
    | null
  >(null);

  const buildStackDragImage = useCallback(
    (cards: Card[], width: number): HTMLElement => {
      const wrap = document.createElement('div');
      wrap.className = 'solitaire-drag-preview';
      wrap.style.width = `${width}px`;
      cards.forEach((card, i) => {
        const c = document.createElement('div');
        c.className = `solitaire-card tableau ${cardColor(card)}`;
        if (i > 0) c.classList.add('stacked');
        const rank = rankLabel(card);
        const suit = suitGlyph(suitOf(card));
        c.innerHTML = `
        <span class="solitaire-card-face">
          <span class="solitaire-corner top-left">
            <span class="solitaire-corner-rank">${rank}</span>
            <span class="solitaire-corner-suit">${suit}</span>
          </span>
          <span class="solitaire-card-pip">${suit}</span>
          <span class="solitaire-corner bottom-right">
            <span class="solitaire-corner-rank">${rank}</span>
            <span class="solitaire-corner-suit">${suit}</span>
          </span>
        </span>`;
        wrap.appendChild(c);
      });
      document.body.appendChild(wrap);
      return wrap;
    },
    []
  );

  const beginDrag = useCallback(
    (event: DragEvent, source: SelectedSource) => {
      if (outcome !== 'playing') {
        event.preventDefault();
        return;
      }
      dragSourceRef.current = source;
      setSelected(source);
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', 'card');

        if (source.type === 'tableau') {
          const cards =
            tableau[source.pileIndex]?.up.slice(source.startIndex) ?? [];
          if (cards.length > 1) {
            const target = event.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;
            const preview = buildStackDragImage(cards, rect.width);
            event.dataTransfer.setDragImage(preview, offsetX, offsetY);
            setTimeout(() => preview.remove(), 0);
          }
        }
      } catch {
        /* ignore */
      }
    },
    [outcome, tableau, buildStackDragImage]
  );

  const endDrag = useCallback(() => {
    dragSourceRef.current = null;
    setDragOverTarget(null);
  }, []);

  const allowDrop = useCallback((event: DragEvent) => {
    if (!dragSourceRef.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDropFoundation = useCallback(
    (event: DragEvent, suit: Suit) => {
      event.preventDefault();
      const source = dragSourceRef.current;
      dragSourceRef.current = null;
      setDragOverTarget(null);
      if (!source) return;
      moveToFoundation(source, suit);
    },
    [moveToFoundation]
  );

  const onDropTableau = useCallback(
    (event: DragEvent, pileIndex: number) => {
      event.preventDefault();
      const source = dragSourceRef.current;
      dragSourceRef.current = null;
      setDragOverTarget(null);
      if (!source) return;
      moveToTableau(source, pileIndex);
    },
    [moveToTableau]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selected) {
        event.preventDefault();
        clearSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, clearSelection]);

  const onDraw = useCallback(() => {
    if (outcome !== 'playing') return;
    markMove();
    clearSelection();
    if (stock.length > 0) {
      const drawn = stock.at(-1)!;
      setStock(prev => prev.slice(0, -1));
      setWaste(prev => [...prev, drawn]);
      return;
    }
    if (waste.length > 0) {
      setStock([...waste].reverse());
      setWaste([]);
    }
  }, [outcome, markMove, clearSelection, stock, waste]);

  return (
    <div className="solitaire-wrap">
      <div className="solitaire-status">
        <p className="timer">{formatDuration(elapsedMs)}</p>
        <span className="solitaire-status-sep">|</span>
        <span>Moves {moves}</span>
        <span className="solitaire-status-sep">|</span>
        <span>Stock {stock.length}</span>
        {statusText ? (
          <span className="solitaire-status-note">{statusText}</span>
        ) : null}
      </div>

      <GameToolbar
        onStartOver={onStartOver}
        onDevSkip={onDevSkip}
        devSkipBusy={devSkipBusy}
      >
        <GameToolbarButton
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          Undo
        </GameToolbarButton>
        <GameToolbarButton
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
        >
          Redo
        </GameToolbarButton>
      </GameToolbar>

      <div className="solitaire-top">
        <div className="solitaire-foundations">
          {SUITS.map(suit => {
            const top = foundations[suit].at(-1);
            const isSelected =
              selected?.type === 'foundation' && selected.suit === suit;
            const isDropTarget =
              dragOverTarget?.kind === 'foundation' &&
              dragOverTarget.suit === suit;
            const colorClass = top
              ? cardColor(top)
              : suit === 'H' || suit === 'D'
                ? 'red'
                : 'black';
            return (
              <button
                key={suit}
                type="button"
                className={`solitaire-card foundation${isSelected ? ' selected' : ''}${isDropTarget ? ' drop-target' : ''}${top ? '' : ' empty'} ${colorClass}`}
                draggable={Boolean(top)}
                onDragStart={event => {
                  if (!top) return;
                  beginDrag(event, { type: 'foundation', suit });
                }}
                onDragEnd={endDrag}
                onDragOver={event => {
                  allowDrop(event);
                  setDragOverTarget({ kind: 'foundation', suit });
                }}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={event => onDropFoundation(event, suit)}
                onClick={() => {
                  if (selected) {
                    void tryMoveSelectionToFoundation(suit);
                    return;
                  }
                  if (!top) return;
                  setSelected({ type: 'foundation', suit });
                }}
                aria-label={`Foundation ${suit}`}
              >
                {top ? (
                  <CardFace card={top} />
                ) : (
                  <span
                    className={`solitaire-foundation-ghost${colorClass === 'red' ? ' red' : ''}`}
                  >
                    {suitGlyph(suit)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className={`solitaire-waste-slot${waste.length === 0 ? ' empty' : ''}`}
          aria-label="Waste pile"
        >
          {waste.length === 0 ? (
            <div className="solitaire-card empty">
              <span className="solitaire-empty-label">Waste</span>
            </div>
          ) : (
            waste.slice(-3).map((card, i, arr) => {
              const isTop = i === arr.length - 1;
              const offsetIndex = arr.length - 1 - i;
              if (!isTop) {
                return (
                  <div
                    key={`waste-bg-${i}-${card}`}
                    className={`solitaire-card waste-bg ${cardColor(card)}`}
                    data-offset={offsetIndex}
                    aria-hidden="true"
                  >
                    <CardFace card={card} />
                  </div>
                );
              }
              return (
                <button
                  key={`waste-top-${card}`}
                  type="button"
                  className={`solitaire-card solitaire-waste ${cardColor(card)}${selected?.type === 'waste' ? ' selected' : ''}`}
                  draggable
                  onDragStart={event => beginDrag(event, { type: 'waste' })}
                  onDragEnd={endDrag}
                  onClick={() => {
                    if (selected?.type === 'waste') {
                      if (moveToFoundation({ type: 'waste' }, suitOf(card)))
                        return;
                      clearSelection();
                      return;
                    }
                    setSelected({ type: 'waste' });
                  }}
                  onDoubleClick={() => {
                    void moveToFoundation({ type: 'waste' }, suitOf(card));
                  }}
                >
                  <CardFace card={card} />
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          className={`solitaire-card solitaire-stock${stock.length === 0 ? ' empty' : ''}${stock.length > 0 ? ' down' : ''}`}
          onClick={onDraw}
          aria-label={stock.length > 0 ? 'Draw card' : 'Reset stock'}
        />
      </div>

      <div className="solitaire-tableau">
        {tableau.map((pile, pileIndex) => {
          const isDropTarget =
            dragOverTarget?.kind === 'tableau' &&
            dragOverTarget.pileIndex === pileIndex;
          return (
            <div
              key={pileIndex}
              className={`solitaire-column${isDropTarget ? ' drop-target' : ''}`}
              onDragOver={event => {
                allowDrop(event);
                setDragOverTarget({ kind: 'tableau', pileIndex });
              }}
              onDragLeave={event => {
                if (
                  event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                )
                  return;
                setDragOverTarget(null);
              }}
              onDrop={event => onDropTableau(event, pileIndex)}
            >
              {pile.down.map((_, idx) => (
                <div
                  key={`down-${pileIndex}-${idx}`}
                  className="solitaire-card down"
                />
              ))}
              {pile.up.map((card, upIndex) => {
                const isSelected =
                  selected?.type === 'tableau' &&
                  selected.pileIndex === pileIndex &&
                  upIndex >= selected.startIndex;
                return (
                  <button
                    key={`up-${pileIndex}-${card}-${upIndex}`}
                    type="button"
                    className={`solitaire-card tableau ${cardColor(card)}${isSelected ? ' selected' : ''}`}
                    draggable
                    onDragStart={event => {
                      beginDrag(event, {
                        type: 'tableau',
                        pileIndex,
                        startIndex: upIndex,
                      });
                    }}
                    onDragEnd={endDrag}
                    onClick={() => {
                      const isTopOfPile = upIndex === pile.up.length - 1;
                      const isSameSelection =
                        selected?.type === 'tableau' &&
                        selected.pileIndex === pileIndex &&
                        selected.startIndex === upIndex;
                      if (isSameSelection && isTopOfPile) {
                        if (moveToFoundation(selected, suitOf(card))) return;
                        clearSelection();
                        return;
                      }
                      if (selected) {
                        if (moveToTableau(selected, pileIndex)) return;
                        if (
                          isTopOfPile &&
                          selected.type === 'tableau' &&
                          selected.pileIndex === pileIndex
                        ) {
                          if (moveToFoundation(selected, suitOf(card))) return;
                        }
                      }
                      setSelected({
                        type: 'tableau',
                        pileIndex,
                        startIndex: upIndex,
                      });
                    }}
                    onDoubleClick={() => {
                      if (upIndex !== pile.up.length - 1) return;
                      void moveToFoundation(
                        { type: 'tableau', pileIndex, startIndex: upIndex },
                        suitOf(card)
                      );
                    }}
                  >
                    <CardFace card={card} />
                  </button>
                );
              })}
              {pile.down.length === 0 && pile.up.length === 0 ? (
                <button
                  type="button"
                  className="solitaire-card tableau empty"
                  onClick={() => {
                    if (!selected) return;
                    void tryMoveSelectionToTableau(pileIndex);
                  }}
                >
                  <span className="solitaire-empty-label">K</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* <button
        type="button"
        className={`solitaire-clear${selected ? ' visible' : ''}`}
        onClick={clearSelection}
        aria-label="Clear selection"
        tabIndex={selected ? 0 : -1}
      >
        Clear (esc)
      </button> */}
    </div>
  );
}
