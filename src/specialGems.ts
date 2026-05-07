import { Gem, SpecialGemType, MatchGroup, GemType } from './types';
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

export function getGemsToRemoveBySpecialGemCollision(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): Gem[] {
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
