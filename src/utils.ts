import { Gem, GemType, SpecialGemType, MatchGroup } from './types';
import { BOARD_ROWS, BOARD_COLS } from './constants';

let gemIdCounter = 0;

export function generateGemId(): string {
  return `gem_${++gemIdCounter}_${Date.now()}`;
}

export function resetGemIdCounter(): void {
  gemIdCounter = 0;
}

export function getRandomGemType(): GemType {
  return Math.floor(Math.random() * 6) as GemType;
}

export function createGem(row: number, col: number, type?: GemType): Gem {
  return {
    id: generateGemId(),
    row,
    col,
    type: type ?? getRandomGemType(),
    specialType: SpecialGemType.NONE
  };
}

export function isAdjacent(gem1: Gem, gem2: Gem): boolean {
  const rowDiff = Math.abs(gem1.row - gem2.row);
  const colDiff = Math.abs(gem1.col - gem2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

export function swapGems(board: (Gem | null)[][], gem1: Gem, gem2: Gem): void {
  const temp = board[gem1.row][gem1.col];
  board[gem1.row][gem1.col] = board[gem2.row][gem2.col];
  board[gem2.row][gem2.col] = temp;
  
  const tempRow = gem1.row;
  const tempCol = gem1.col;
  gem1.row = gem2.row;
  gem1.col = gem2.col;
  gem2.row = tempRow;
  gem2.col = tempCol;
}

export function findAllMatches(board: (Gem | null)[][]): MatchGroup[] {
  const matches: MatchGroup[] = [];
  const matchedGems = new Set<string>();
  
  for (let row = 0; row < BOARD_ROWS; row++) {
    let matchStart = 0;
    let currentType: GemType | null = null;
    
    for (let col = 0; col <= BOARD_COLS; col++) {
      const gem = col < BOARD_COLS ? board[row][col] : null;
      const gemType = gem?.type ?? null;
      
      if (gemType === null || gemType !== currentType) {
        if (currentType !== null && col - matchStart >= 3) {
          const groupGems: Gem[] = [];
          for (let c = matchStart; c < col; c++) {
            const g = board[row][c];
            if (g && !matchedGems.has(g.id)) {
              groupGems.push(g);
              matchedGems.add(g.id);
            }
          }
          if (groupGems.length >= 3) {
            matches.push({
              gems: groupGems,
              direction: 'horizontal',
              length: groupGems.length
            });
          }
        }
        matchStart = col;
        currentType = gemType;
      }
    }
  }
  
  for (let col = 0; col < BOARD_COLS; col++) {
    let matchStart = 0;
    let currentType: GemType | null = null;
    
    for (let row = 0; row <= BOARD_ROWS; row++) {
      const gem = row < BOARD_ROWS ? board[row][col] : null;
      const gemType = gem?.type ?? null;
      
      if (gemType === null || gemType !== currentType) {
        if (currentType !== null && row - matchStart >= 3) {
          const groupGems: Gem[] = [];
          for (let r = matchStart; r < row; r++) {
            const g = board[r][col];
            if (g && !matchedGems.has(g.id)) {
              groupGems.push(g);
              matchedGems.add(g.id);
            }
          }
          if (groupGems.length >= 3) {
            matches.push({
              gems: groupGems,
              direction: 'vertical',
              length: groupGems.length
            });
          }
        }
        matchStart = row;
        currentType = gemType;
      }
    }
  }
  
  return matches;
}

export function hasAnyMatch(board: (Gem | null)[][]): boolean {
  return findAllMatches(board).length > 0;
}

export function createInitialBoard(): (Gem | null)[][] {
  const board: (Gem | null)[][] = [];
  
  for (let row = 0; row < BOARD_ROWS; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_COLS; col++) {
      let gem: Gem;
      do {
        gem = createGem(row, col);
        board[row][col] = gem;
      } while (hasAnyMatchAt(board, row, col));
    }
  }
  
  return board;
}

function hasAnyMatchAt(board: (Gem | null)[][], row: number, col: number): boolean {
  const gem = board[row][col];
  if (!gem) return false;
  
  let horizontalCount = 1;
  let c = col - 1;
  while (c >= 0 && board[row][c]?.type === gem.type) {
    horizontalCount++;
    c--;
  }
  c = col + 1;
  while (c < BOARD_COLS && board[row][c]?.type === gem.type) {
    horizontalCount++;
    c++;
  }
  
  let verticalCount = 1;
  let r = row - 1;
  while (r >= 0 && board[r]?.[col]?.type === gem.type) {
    verticalCount++;
    r--;
  }
  r = row + 1;
  while (r < BOARD_ROWS && board[r]?.[col]?.type === gem.type) {
    verticalCount++;
    r++;
  }
  
  return horizontalCount >= 3 || verticalCount >= 3;
}

export function shuffleBoard(board: (Gem | null)[][]): void {
  const allGems: Gem[] = [];
  
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const gem = board[row][col];
      if (gem) {
        allGems.push(gem);
      }
    }
  }
  
  for (let i = allGems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allGems[i], allGems[j]] = [allGems[j], allGems[i]];
  }
  
  let index = 0;
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const gem = allGems[index++];
      gem.row = row;
      gem.col = col;
      board[row][col] = gem;
    }
  }
}

export function hasPossibleMoves(board: (Gem | null)[][]): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const currentGem = board[row][col];
      if (!currentGem) continue;
      
      if (col < BOARD_COLS - 1) {
        const rightGem = board[row][col + 1];
        if (rightGem && wouldCreateMatch(board, currentGem, rightGem)) {
          return true;
        }
      }
      
      if (row < BOARD_ROWS - 1) {
        const bottomGem = board[row + 1][col];
        if (bottomGem && wouldCreateMatch(board, currentGem, bottomGem)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function wouldCreateMatch(
  board: (Gem | null)[][],
  gem1: Gem,
  gem2: Gem
): boolean {
  const tempType1 = gem1.type;
  const tempType2 = gem2.type;
  
  gem1.type = tempType2;
  gem2.type = tempType1;
  
  const matches = findAllMatches(board);
  const hasMatch = matches.length > 0;
  
  gem1.type = tempType1;
  gem2.type = tempType2;
  
  return hasMatch;
}
