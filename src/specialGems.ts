import { Gem, SpecialGemType, MatchGroup, GemType, SpecialCombination, CombinationResult } from './types';
import { BOARD_ROWS, BOARD_COLS } from './constants';

export function determineSpecialGemType(matches: MatchGroup[]): SpecialGemType {
  let maxLength = 0;
  let hasHorizontal = false;
  let hasVertical = false;

  for (const match of matches) {
    if (match.length > maxLength) {
      maxLength = match.length;
    }
    if (match.direction === 'horizontal') {
      hasHorizontal = true;
    }
    if (match.direction === 'vertical') {
      hasVertical = true;
    }
  }

  if (maxLength >= 5) {
    return SpecialGemType.COLOR_BOMB;
  }

  if (hasHorizontal && hasVertical && maxLength >= 3) {
    return SpecialGemType.WRAPPED;
  }

  if (maxLength === 4) {
    return hasHorizontal
      ? SpecialGemType.STRIPED_HORIZONTAL
      : SpecialGemType.STRIPED_VERTICAL;
  }

  return SpecialGemType.NONE;
}

export function getGemsToRemoveBySpecialGem(
  gem: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gemsToRemove: Gem[] = [];

  switch (gem.specialType) {
    case SpecialGemType.STRIPED_HORIZONTAL:
      for (let col = 0; col < BOARD_COLS; col++) {
        const g = board[gem.row][col];
        if (g && g.id !== gem.id) {
          gemsToRemove.push(g);
        }
      }
      break;

    case SpecialGemType.STRIPED_VERTICAL:
      for (let row = 0; row < BOARD_ROWS; row++) {
        const g = board[row][gem.col];
        if (g && g.id !== gem.id) {
          gemsToRemove.push(g);
        }
      }
      break;

    case SpecialGemType.WRAPPED:
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const newRow = gem.row + dr;
          const newCol = gem.col + dc;
          if (
            newRow >= 0 && newRow < BOARD_ROWS &&
            newCol >= 0 && newCol < BOARD_COLS
          ) {
            const g = board[newRow][newCol];
            if (g && g.id !== gem.id) {
              gemsToRemove.push(g);
            }
          }
        }
      }
      break;

    case SpecialGemType.COLOR_BOMB:
      break;
  }

  return gemsToRemove;
}

export function getGemsToRemoveByColorBomb(
  colorBomb: Gem,
  targetGem: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gemsToRemove: Gem[] = [colorBomb];
  const targetType = targetGem.type;

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const gem = board[row][col];
      if (gem && gem.type === targetType && gem.id !== colorBomb.id) {
        gemsToRemove.push(gem);
      }
    }
  }

  return gemsToRemove;
}

function isStriped(type: SpecialGemType): boolean {
  return type === SpecialGemType.STRIPED_HORIZONTAL || type === SpecialGemType.STRIPED_VERTICAL;
}

function isAnyBomb(type: SpecialGemType): boolean {
  return type === SpecialGemType.WRAPPED || type === SpecialGemType.COLOR_BOMB;
}

export function detectSpecialCombination(
  gem1: Gem,
  gem2: Gem
): SpecialCombination {
  const t1 = gem1.specialType;
  const t2 = gem2.specialType;

  if (t1 === SpecialGemType.NONE || t2 === SpecialGemType.NONE) {
    return SpecialCombination.NONE;
  }

  const bothStriped = isStriped(t1) && isStriped(t2);
  const horizontalAndVertical =
    (t1 === SpecialGemType.STRIPED_HORIZONTAL && t2 === SpecialGemType.STRIPED_VERTICAL) ||
    (t1 === SpecialGemType.STRIPED_VERTICAL && t2 === SpecialGemType.STRIPED_HORIZONTAL);

  if (horizontalAndVertical) {
    return SpecialCombination.CROSS;
  }

  const stripedAndBomb =
    (isStriped(t1) && isAnyBomb(t2)) ||
    (isAnyBomb(t1) && isStriped(t2));

  if (bothStriped && !horizontalAndVertical) {
    return SpecialCombination.CROSS;
  }

  if (t1 === SpecialGemType.WRAPPED && t2 === SpecialGemType.WRAPPED) {
    return SpecialCombination.FIVE_BY_FIVE;
  }

  if (stripedAndBomb) {
    return SpecialCombination.THREE_ROWS;
  }

  if (t1 === SpecialGemType.COLOR_BOMB && isAnyBomb(t2) ||
      isAnyBomb(t1) && t2 === SpecialGemType.COLOR_BOMB) {
    return SpecialCombination.THREE_ROWS;
  }

  if (t1 === SpecialGemType.COLOR_BOMB && t2 === SpecialGemType.COLOR_BOMB) {
    return SpecialCombination.FIVE_BY_FIVE;
  }

  return SpecialCombination.NONE;
}

function collectCross(gem1: Gem, gem2: Gem, board: (Gem | null)[][]): Gem[] {
  const result: Gem[] = [gem1, gem2];
  const added = new Set<string>([gem1.id, gem2.id]);

  for (const gem of [gem1, gem2]) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const g = board[gem.row][col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
    for (let row = 0; row < BOARD_ROWS; row++) {
      const g = board[row][gem.col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
  }

  return result;
}

function collectThreeRows(gem1: Gem, gem2: Gem, board: (Gem | null)[][]): Gem[] {
  const result: Gem[] = [gem1, gem2];
  const added = new Set<string>([gem1.id, gem2.id]);
  const centerRow = gem1.row;

  for (let dr = -1; dr <= 1; dr++) {
    const row = centerRow + dr;
    if (row < 0 || row >= BOARD_ROWS) continue;
    for (let col = 0; col < BOARD_COLS; col++) {
      const g = board[row][col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
  }

  return result;
}

function collectFiveByFive(gem1: Gem, gem2: Gem, board: (Gem | null)[][]): Gem[] {
  const result: Gem[] = [gem1, gem2];
  const added = new Set<string>([gem1.id, gem2.id]);
  const centerRow = gem1.row;
  const centerCol = gem1.col;

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const row = centerRow + dr;
      const col = centerCol + dc;
      if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) continue;
      const g = board[row][col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
  }

  return result;
}

function collectCrossPlusBlast(gem1: Gem, gem2: Gem, board: (Gem | null)[][]): Gem[] {
  const result: Gem[] = [gem1, gem2];
  const added = new Set<string>([gem1.id, gem2.id]);

  for (const gem of [gem1, gem2]) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const g = board[gem.row][col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
    for (let row = 0; row < BOARD_ROWS; row++) {
      const g = board[row][gem.col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
  }

  const centerRow = gem1.row;
  const centerCol = gem1.col;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const row = centerRow + dr;
      const col = centerCol + dc;
      if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) continue;
      const g = board[row][col];
      if (g && !added.has(g.id)) {
        result.push(g);
        added.add(g.id);
      }
    }
  }

  return result;
}

export function calculateCombinationEffect(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): CombinationResult {
  const combination = detectSpecialCombination(gem1, gem2);
  const triggerRow = gem1.row;
  const triggerCol = gem1.col;

  switch (combination) {
    case SpecialCombination.CROSS: {
      const gemsToRemove = collectCross(gem1, gem2, board);
      return {
        combination,
        gemsToRemove,
        scoreMultiplier: 3,
        triggerRow,
        triggerCol
      };
    }

    case SpecialCombination.THREE_ROWS: {
      const gemsToRemove = collectThreeRows(gem1, gem2, board);
      return {
        combination,
        gemsToRemove,
        scoreMultiplier: 4,
        triggerRow,
        triggerCol
      };
    }

    case SpecialCombination.FIVE_BY_FIVE: {
      const gemsToRemove = collectFiveByFive(gem1, gem2, board);
      return {
        combination,
        gemsToRemove,
        scoreMultiplier: 5,
        triggerRow,
        triggerCol
      };
    }

    case SpecialCombination.CROSS_PLUS_BLAST: {
      const gemsToRemove = collectCrossPlusBlast(gem1, gem2, board);
      return {
        combination,
        gemsToRemove,
        scoreMultiplier: 6,
        triggerRow,
        triggerCol
      };
    }

    default:
      return {
        combination: SpecialCombination.NONE,
        gemsToRemove: [gem1, gem2],
        scoreMultiplier: 1,
        triggerRow,
        triggerCol
      };
  }
}

export function getGemsToRemoveBySpecialGemCollision(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const combination = detectSpecialCombination(gem1, gem2);

  if (combination !== SpecialCombination.NONE) {
    return calculateCombinationEffect(gem1, gem2, board).gemsToRemove;
  }

  const gemsToRemove: Gem[] = [gem1, gem2];

  if (
    gem1.specialType === SpecialGemType.STRIPED_HORIZONTAL ||
    gem1.specialType === SpecialGemType.STRIPED_VERTICAL ||
    gem2.specialType === SpecialGemType.STRIPED_HORIZONTAL ||
    gem2.specialType === SpecialGemType.STRIPED_VERTICAL
  ) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const g = board[gem1.row][col];
      if (g && !gemsToRemove.some(r => r.id === g.id)) {
        gemsToRemove.push(g);
      }
    }
    for (let row = 0; row < BOARD_ROWS; row++) {
      const g = board[row][gem1.col];
      if (g && !gemsToRemove.some(r => r.id === g.id)) {
        gemsToRemove.push(g);
      }
    }
  }

  if (
    gem1.specialType === SpecialGemType.WRAPPED ||
    gem2.specialType === SpecialGemType.WRAPPED
  ) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const newRow = gem1.row + dr;
        const newCol = gem1.col + dc;
        if (
          newRow >= 0 && newRow < BOARD_ROWS &&
          newCol >= 0 && newCol < BOARD_COLS
        ) {
          const g = board[newRow][newCol];
          if (g && !gemsToRemove.some(r => r.id === g.id)) {
            gemsToRemove.push(g);
          }
        }
      }
    }
  }

  if (gem1.specialType === SpecialGemType.COLOR_BOMB) {
    if (gem2.specialType !== SpecialGemType.NONE) {
      const randomType = getRandomTypeExcluding();
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const gem = board[row][col];
          if (gem && gem.type === randomType && !gemsToRemove.some(r => r.id === gem.id)) {
            gemsToRemove.push(gem);
          }
        }
      }
    }
  }

  if (gem2.specialType === SpecialGemType.COLOR_BOMB) {
    if (gem1.specialType !== SpecialGemType.NONE) {
      const randomType = getRandomTypeExcluding();
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          const gem = board[row][col];
          if (gem && gem.type === randomType && !gemsToRemove.some(r => r.id === gem.id)) {
            gemsToRemove.push(gem);
          }
        }
      }
    }
  }

  return gemsToRemove;
}

function getRandomTypeExcluding(): GemType {
  return Math.floor(Math.random() * 6) as GemType;
}

export function convertToSpecialGem(
  gem: Gem,
  specialType: SpecialGemType
): Gem {
  return {
    ...gem,
    specialType
  };
}
