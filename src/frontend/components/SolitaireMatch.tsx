import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useElapsedTimer } from '../hooks/useElapsedTimer';
import type { SolitaireProgress } from '../utils/gameProgress';
import { formatDuration } from '../utils/time';

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;
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

function formatCard(card: Card): string {
  const rank = card[0] === 'T' ? '10' : card[0];
  const suit = suitOf(card);
  if (suit === 'H') return `${rank}♥`;
  if (suit === 'D') return `${rank}♦`;
  if (suit === 'C') return `${rank}♣`;
  return `${rank}♠`;
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
  if (!Array.isArray(saved.tableau) || saved.tableau.length !== TABLEAU_COUNT) return false;
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
    cardColor(top) !== cardColor(card) &&
    rankValue(top) === rankValue(card) + 1
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

export function SolitaireMatch({ saved, onWin, onProgressChange }: Props) {
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
  const [foundations, setFoundations] = useState<Foundations>(() => base.foundations);
  const [startedAt, setStartedAt] = useState<number | null>(base.startedAt ?? null);
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

  const finishWin = useCallback(
    (start: number | null) => {
      if (wonRef.current) return;
      wonRef.current = true;
      const ms = Math.max(1, Date.now() - (start ?? Date.now()));
      setFrozenElapsedMs(ms);
      setOutcome('won');
      setStatusText('Victory! Sending your code...');
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
    if (!startedAt) setStartedAt(Date.now());
    setMoves(prev => prev + 1);
    setStatusText('');
  }, [startedAt]);

  const clearSelection = useCallback(() => setSelected(null), []);

  const tryMoveSelectionToFoundation = useCallback(
    (targetSuit: Suit) => {
      if (!selected || outcome !== 'playing') return;
      const cards = selectedCards(selected, tableau, waste, foundations);
      if (cards.length !== 1) return;
      const card = cards[0]!;
      if (suitOf(card) !== targetSuit) return;
      if (!foundationCanTake(foundations, card)) return;

      markMove();

      if (selected.type === 'waste') {
        setWaste(prev => prev.slice(0, -1));
      } else if (selected.type === 'foundation') {
        if (selected.suit === targetSuit) return;
        setFoundations(prev => ({
          ...prev,
          [selected.suit]: prev[selected.suit].slice(0, -1),
        }));
      } else {
        setTableau(prev => {
          const next = prev.map(p => ({ down: [...p.down], up: [...p.up] }));
          next[selected.pileIndex]!.up = next[selected.pileIndex]!.up.slice(
            0,
            selected.startIndex
          );
          next[selected.pileIndex] = maybeFlipTableauTop(next[selected.pileIndex]!);
          return next;
        });
      }

      setFoundations(prev => ({
        ...prev,
        [targetSuit]: [...prev[targetSuit], card],
      }));
      clearSelection();
    },
    [selected, outcome, tableau, waste, foundations, markMove, clearSelection]
  );

  const tryMoveSelectionToTableau = useCallback(
    (targetIndex: number) => {
      if (!selected || outcome !== 'playing') return;
      const moving = selectedCards(selected, tableau, waste, foundations);
      if (moving.length === 0) return;
      const first = moving[0]!;
      const target = tableau[targetIndex];
      if (!target || !tableauCanTake(target, first)) return;

      markMove();

      if (selected.type === 'waste') {
        setWaste(prev => prev.slice(0, -1));
      } else if (selected.type === 'foundation') {
        setFoundations(prev => ({
          ...prev,
          [selected.suit]: prev[selected.suit].slice(0, -1),
        }));
      } else {
        setTableau(prev => {
          const next = prev.map(p => ({ down: [...p.down], up: [...p.up] }));
          next[selected.pileIndex]!.up = next[selected.pileIndex]!.up.slice(
            0,
            selected.startIndex
          );
          next[selected.pileIndex] = maybeFlipTableauTop(next[selected.pileIndex]!);
          return next;
        });
      }

      setTableau(prev => {
        const next = prev.map(p => ({ down: [...p.down], up: [...p.up] }));
        next[targetIndex]!.up.push(...moving);
        return next;
      });

      clearSelection();
    },
    [selected, outcome, tableau, waste, foundations, markMove, clearSelection]
  );

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
      <p className="timer">Time: {formatDuration(elapsedMs)}</p>
      {statusText ? <p className="timer">{statusText}</p> : null}
      <p className="solitaire-meta">
        Moves: {moves} | Stock: {stock.length}
      </p>

      <div className="solitaire-top">
        <button
          type="button"
          className={`solitaire-card solitaire-stock${stock.length === 0 ? ' empty' : ''}`}
          onClick={onDraw}
        >
          {stock.length > 0 ? <span className="solitaire-back">BACK</span> : <span>Reset</span>}
        </button>

        <button
          type="button"
          className={`solitaire-card solitaire-waste${selected?.type === 'waste' ? ' selected' : ''}${waste.length === 0 ? ' empty' : ''}`}
          onClick={() => {
            if (waste.length === 0) return;
            setSelected(prev => (prev?.type === 'waste' ? null : { type: 'waste' }));
          }}
          onDoubleClick={() => {
            const top = waste.at(-1);
            if (!top) return;
            void tryMoveSelectionToFoundation(suitOf(top));
          }}
        >
          {waste.length > 0 ? (
            <span className={`solitaire-card-label ${cardColor(waste.at(-1)!)}`}>
              {formatCard(waste.at(-1)!)}
            </span>
          ) : (
            <span className="solitaire-empty-label">Waste</span>
          )}
        </button>

        <div className="solitaire-foundations">
          {SUITS.map(suit => {
            const top = foundations[suit].at(-1);
            const isSelected =
              selected?.type === 'foundation' && selected.suit === suit;
            return (
              <button
                key={suit}
                type="button"
                className={`solitaire-card foundation${isSelected ? ' selected' : ''}${top ? '' : ' empty'}`}
                onClick={() => {
                  if (selected) {
                    void tryMoveSelectionToFoundation(suit);
                    return;
                  }
                  if (!top) return;
                  setSelected({ type: 'foundation', suit });
                }}
              >
                {top ? (
                  <span className={`solitaire-card-label ${cardColor(top)}`}>
                    {formatCard(top)}
                  </span>
                ) : (
                  <span className="solitaire-empty-label">{suit}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="solitaire-tableau">
        {tableau.map((pile, pileIndex) => (
          <div key={pileIndex} className="solitaire-column">
            {pile.down.map((_, idx) => (
              <div key={`down-${pileIndex}-${idx}`} className="solitaire-card down">
                <span className="solitaire-back">BACK</span>
              </div>
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
                  className={`solitaire-card tableau${isSelected ? ' selected' : ''}`}
                  onClick={() => {
                    if (selected) {
                      void tryMoveSelectionToTableau(pileIndex);
                      return;
                    }
                    setSelected({
                      type: 'tableau',
                      pileIndex,
                      startIndex: upIndex,
                    });
                  }}
                  onDoubleClick={() => {
                    if (upIndex !== pile.up.length - 1) return;
                    void tryMoveSelectionToFoundation(suitOf(card));
                  }}
                >
                  <span className={`solitaire-card-label ${cardColor(card)}`}>
                    {formatCard(card)}
                  </span>
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
                <span className="solitaire-empty-label">Empty</span>
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {selected ? (
        <button type="button" className="secondary" onClick={clearSelection}>
          Clear selection
        </button>
      ) : null}
    </div>
  );
}
