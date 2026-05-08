import { Gem, SpecialGemType, MatchGroup } from './types';
import { BOARD_ROWS, BOARD_COLS, SCORE_PER_GEM, SCORE_SPECIAL_GEM_MULTIPLIER } from './constants';

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

export enum SpecialGemCombination {
  NONE = 0,
  HORIZONTAL_VERTICAL_CROSS = 1,
  HORIZONTAL_WRAPPED_THREE_ROWS = 2,
  VERTICAL_WRAPPED_THREE_COLS = 3,
  WRAPPED_WRAPPED_5X5 = 4,
  COLOR_BOMB_SPECIAL = 5,
  COLOR_BOMB_COLOR_BOMB = 6,
  OTHER = 7,
}

export interface SpecialGemCollisionResult {
  gemsToRemove: Gem[];
  chainGems: Gem[];
  combination: SpecialGemCombination;
  baseScore: number;
  triggeredGems: Gem[];
}

export function isSpecialGemCollision(
  gem1: Gem,
  gem2: Gem
): boolean {
  return gem1.specialType !== SpecialGemType.NONE &&
         gem2.specialType !== SpecialGemType.NONE;
}

export function getGemsToRemoveBySpecialGemCollision(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const result = handleSpecialGemCollision(gem1, gem2, board);
  return result.gemsToRemove;
}

export function handleSpecialGemCollision(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): SpecialGemCollisionResult {
  const gemsToRemove: Gem[] = [];
  const chainGems: Gem[] = [];
  const triggeredGems: Gem[] = [gem1, gem2];
  let combination: SpecialGemCombination = SpecialGemCombination.NONE;
  const gem1Score = getSpecialGemBaseScore(gem1.specialType);
  const gem2Score = getSpecialGemBaseScore(gem2.specialType);

  const types = [gem1.specialType, gem2.specialType].sort((a, b) => a - b);
  const type1 = types[0];
  const type2 = types[1];

  if (
    type1 === SpecialGemType.STRIPED_HORIZONTAL && 
    type2 === SpecialGemType.STRIPED_VERTICAL
  ) {
    combination = SpecialGemCombination.HORIZONTAL_VERTICAL_CROSS;
    const crossGems = getCrossGems(gem1, gem2, board);
    addGemsToResult(crossGems, gemsToRemove, chainGems, triggeredGems);
  } else if (
    type1 === SpecialGemType.STRIPED_HORIZONTAL && 
    type2 === SpecialGemType.WRAPPED
  ) {
    combination = SpecialGemCombination.HORIZONTAL_WRAPPED_THREE_ROWS;
    const wrappedGem = gem1.specialType === SpecialGemType.WRAPPED ? gem1 : gem2;
    const rowGems = getThreeRowsGems(wrappedGem, board);
    addGemsToResult(rowGems, gemsToRemove, chainGems, triggeredGems);
  } else if (
    type1 === SpecialGemType.STRIPED_VERTICAL && 
    type2 === SpecialGemType.WRAPPED
  ) {
    combination = SpecialGemCombination.VERTICAL_WRAPPED_THREE_COLS;
    const wrappedGem = gem1.specialType === SpecialGemType.WRAPPED ? gem1 : gem2;
    const colGems = getThreeColsGems(wrappedGem, board);
    addGemsToResult(colGems, gemsToRemove, chainGems, triggeredGems);
  } else if (
    type1 === SpecialGemType.WRAPPED && 
    type2 === SpecialGemType.WRAPPED
  ) {
    combination = SpecialGemCombination.WRAPPED_WRAPPED_5X5;
    const areaGems = get5x5AreaGems(gem1, gem2, board);
    addGemsToResult(areaGems, gemsToRemove, chainGems, triggeredGems);
  } else if (
    type1 === SpecialGemType.COLOR_BOMB
  ) {
    if (type2 === SpecialGemType.COLOR_BOMB) {
      combination = SpecialGemCombination.COLOR_BOMB_COLOR_BOMB;
      const allClear = getClearAllGems(board);
      addGemsToResult(allClear, gemsToRemove, chainGems, triggeredGems);
    } else {
      combination = SpecialGemCombination.COLOR_BOMB_SPECIAL;
      const specialGem = gem1.specialType === SpecialGemType.COLOR_BOMB ? gem2 : gem1;
      const colorBombSpecialGems = getColorBombSpecialGems(specialGem, board);
      addGemsToResult(colorBombSpecialGems, gemsToRemove, chainGems, triggeredGems);
    }
  } else {
    combination = SpecialGemCombination.OTHER;
    const combo = getDefaultComboGems(gem1, gem2, board);
    addGemsToResult(combo, gemsToRemove, chainGems, triggeredGems);
  }

  return {
    gemsToRemove,
    chainGems,
    combination,
    baseScore: gem1Score + gem2Score,
    triggeredGems
  };
}

function addGemsToResult(
  gems: Gem[],
  gemsToRemove: Gem[],
  chainGems: Gem[],
  triggeredGems: Gem[]
): void {
  for (const g of gems) {
    if (!triggeredGems.some(existing => existing.id === g.id)) {
      if (g.specialType !== SpecialGemType.NONE) {
        chainGems.push(g);
      } else {
        if (!gemsToRemove.some(existing => existing.id === g.id)) {
          gemsToRemove.push(g);
        }
      }
    }
  }
}

function getCrossGems(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];
  const rows = [gem1.row, gem2.row];
  const cols = [gem1.col, gem2.col];

  for (const row of rows) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const g = board[row][col];
      if (g) {
        gems.push(g);
      }
    }
  }

  for (const col of cols) {
    for (let row = 0; row < BOARD_ROWS; row++) {
      const g = board[row][col];
      if (g && !gems.some(existing => existing.id === g.id)) {
        gems.push(g);
      }
    }
  }

  return gems;
}

function getThreeRowsGems(
  wrappedGem: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];
  const baseRow = wrappedGem.row;

  for (let r = baseRow - 1; r <= baseRow + 1; r++) {
    if (r >= 0 && r < BOARD_ROWS) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const g = board[r][col];
        if (g) {
          gems.push(g);
        }
      }
    }
  }

  return gems;
}

function getThreeColsGems(
  wrappedGem: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];
  const baseCol = wrappedGem.col;

  for (let c = baseCol - 1; c <= baseCol + 1; c++) {
    if (c >= 0 && c < BOARD_COLS) {
      for (let row = 0; row < BOARD_ROWS; row++) {
        const g = board[row][c];
        if (g) {
          gems.push(g);
        }
      }
    }
  }

  return gems;
}

function get5x5AreaGems(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];
  const centerRow = Math.floor((gem1.row + gem2.row) / 2);
  const centerCol = Math.floor((gem1.col + gem2.col) / 2);

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const newRow = centerRow + dr;
      const newCol = centerCol + dc;
      if (
        newRow >= 0 && newRow < BOARD_ROWS &&
        newCol >= 0 && newCol < BOARD_COLS
      ) {
        const g = board[newRow][newCol];
        if (g) {
          gems.push(g);
        }
      }
    }
  }

  return gems;
}

function getClearAllGems(
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const g = board[row][col];
      if (g) {
        gems.push(g);
      }
    }
  }

  return gems;
}

function getColorBombSpecialGems(
  specialGem: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];
  const basicGems = getGemsToRemoveBySpecialGem(specialGem, board);
  
  for (const g of basicGems) {
    gems.push(g);
  }

  const targetType = specialGem.type;
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const gem = board[row][col];
      if (gem && gem.type === targetType && !gems.some(existing => existing.id === gem.id)) {
        gems.push(gem);
      }
    }
  }

  return gems;
}

function getDefaultComboGems(
  gem1: Gem,
  gem2: Gem,
  board: (Gem | null)[][]
): Gem[] {
  const gems: Gem[] = [];

  const gems1 = getGemsToRemoveBySpecialGem(gem1, board);
  const gems2 = getGemsToRemoveBySpecialGem(gem2, board);

  for (const g of [...gems1, ...gems2]) {
    if (!gems.some(existing => existing.id === g.id)) {
      gems.push(g);
    }
  }

  return gems;
}

export function getSpecialGemBaseScore(specialType: SpecialGemType): number {
  switch (specialType) {
    case SpecialGemType.STRIPED_HORIZONTAL:
    case SpecialGemType.STRIPED_VERTICAL:
      return Math.floor(BOARD_COLS * SCORE_PER_GEM * SCORE_SPECIAL_GEM_MULTIPLIER);
    case SpecialGemType.WRAPPED:
      return Math.floor(9 * SCORE_PER_GEM * SCORE_SPECIAL_GEM_MULTIPLIER);
    case SpecialGemType.COLOR_BOMB:
      return Math.floor(BOARD_ROWS * BOARD_COLS * SCORE_PER_GEM * SCORE_SPECIAL_GEM_MULTIPLIER);
    default:
      return SCORE_PER_GEM;
  }
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

export function processChainGems(
  chainGems: Gem[],
  board: (Gem | null)[][]
): { gemsToRemove: Gem[]; additionalChainGems: Gem[]; totalChainScore: number } {
  let gemsToRemove: Gem[] = [];
  let additionalChainGems: Gem[] = [];
  let totalChainScore = 0;
  const processed: Set<string> = new Set();

  const queue = [...chainGems];
  
  while (queue.length > 0) {
    const gem = queue.shift();
    if (!gem || processed.has(gem.id)) continue;
    
    processed.add(gem.id);
    
    if (gem.specialType === SpecialGemType.NONE) {
      if (!gemsToRemove.some(g => g.id === gem.id)) {
        gemsToRemove.push(gem);
      }
      continue;
    }

    totalChainScore += getSpecialGemBaseScore(gem.specialType);

    const gems = getGemsToRemoveBySpecialGem(gem, board);
    
    for (const g of gems) {
      if (processed.has(g.id)) continue;
      
      if (g.specialType !== SpecialGemType.NONE) {
        if (!queue.some(q => q.id === g.id)) {
          queue.push(g);
        }
      } else {
        if (!gemsToRemove.some(existing => existing.id === g.id)) {
          gemsToRemove.push(g);
        }
      }
    }
    
    if (!gemsToRemove.some(g => g.id === gem.id)) {
      gemsToRemove.push(gem);
    }
  }

  return { gemsToRemove, additionalChainGems, totalChainScore };
}
