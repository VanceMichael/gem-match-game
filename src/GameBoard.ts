import {
  Gem,
  GameState,
  SpecialGemType,
  CascadeResult
} from './types';
import {
  BOARD_ROWS,
  BOARD_COLS,
  SCORE_PER_GEM,
  SCORE_PER_COMBO_MULTIPLIER,
  SCORE_SPECIAL_GEM_MULTIPLIER
} from './constants';
import {
  createInitialBoard,
  swapGems,
  findAllMatches,
  isAdjacent,
  shuffleBoard,
  hasPossibleMoves,
  createGem
} from './utils';
import {
  determineSpecialGemType,
  getGemsToRemoveBySpecialGem,
  convertToSpecialGem,
  handleSpecialGemCollision,
  isSpecialGemCollision,
  processChainGems,
  SpecialGemCombination,
  getSpecialGemBaseScore
} from './specialGems';

export type SwapCallback = (gem1: Gem, gem2: Gem, isSwapBack: boolean) => Promise<void>;

export type SpecialCombinationCallback = (
  gem1: Gem,
  gem2: Gem,
  combination: SpecialGemCombination
) => Promise<void>;

export type BoardUpdateCallback = (
  gemsToRemove: Gem[],
  gemsToFall: { gem: Gem; targetRow: number }[],
  gemsToCreate: { gem: Gem; startRow: number }[],
  gemsToUpdate: Gem[]
) => Promise<void>;

export type ScoreUpdateCallback = (
  score: number,
  combo: number,
  gemsCleared: number
) => void;

export class GameBoard {
  private board: (Gem | null)[][];
  private state: GameState;
  private selectedGem: Gem | null;
  private onUpdate: BoardUpdateCallback | null;
  private onScoreUpdate: ScoreUpdateCallback | null;
  private onSwap: SwapCallback | null;
  private onSpecialCombination: SpecialCombinationCallback | null;
  private isSimulation: boolean;

  constructor(simulation = false) {
    this.board = createInitialBoard();
    this.state = GameState.READY;
    this.selectedGem = null;
    this.onUpdate = null;
    this.onScoreUpdate = null;
    this.onSwap = null;
    this.onSpecialCombination = null;
    this.isSimulation = simulation;
    
    while (!hasPossibleMoves(this.board)) {
      shuffleBoard(this.board);
      this.board = createInitialBoard();
    }
  }

  setUpdateCallback(callback: BoardUpdateCallback): void {
    this.onUpdate = callback;
  }

  setScoreUpdateCallback(callback: ScoreUpdateCallback): void {
    this.onScoreUpdate = callback;
  }

  setSwapCallback(callback: SwapCallback): void {
    this.onSwap = callback;
  }

  setSpecialCombinationCallback(callback: SpecialCombinationCallback): void {
    this.onSpecialCombination = callback;
  }

  getState(): GameState {
    return this.state;
  }

  getBoard(): (Gem | null)[][] {
    return this.board;
  }

  getSelectedGem(): Gem | null {
    return this.selectedGem;
  }

  selectGem(gem: Gem): boolean {
    if (this.state !== GameState.READY && this.state !== GameState.SELECTING) {
      return false;
    }

    if (!this.selectedGem) {
      this.selectedGem = gem;
      this.state = GameState.SELECTING;
      return true;
    }

    if (this.selectedGem.id === gem.id) {
      this.selectedGem = null;
      this.state = GameState.READY;
      return true;
    }

    if (isAdjacent(this.selectedGem, gem)) {
      this.trySwap(this.selectedGem, gem);
      return true;
    }

    this.selectedGem = gem;
    return true;
  }

  private async trySwap(gem1: Gem, gem2: Gem): Promise<void> {
    this.state = GameState.SWAPPING;
    this.selectedGem = null;

    if (this.onSwap && !this.isSimulation) {
      await this.onSwap(gem1, gem2, false);
    }

    swapGems(this.board, gem1, gem2);
    
    const matches = findAllMatches(this.board);
    
    const hasSpecialCollision = isSpecialGemCollision(gem1, gem2);
    
    if (matches.length === 0 && !hasSpecialCollision) {
      if (this.onSwap && !this.isSimulation) {
        await this.onSwap(gem1, gem2, true);
      }
      swapGems(this.board, gem1, gem2);
      this.state = GameState.READY;
      return;
    }

    if (hasSpecialCollision) {
      if (this.onSpecialCombination && !this.isSimulation) {
        const result = handleSpecialGemCollision(gem1, gem2, this.board);
        if (result.combination !== SpecialGemCombination.NONE) {
          await this.onSpecialCombination(gem1, gem2, result.combination);
        }
      }
      if (matches.length === 0) {
        await this.processSpecialCollision(gem1, gem2);
        return;
      }
    }

    await this.processMatches();
  }

  private hasEmptySpaces(): boolean {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        if (this.board[row][col] === null) {
          return true;
        }
      }
    }
    return false;
  }

  private async processSpecialCollision(gem1: Gem, gem2: Gem): Promise<CascadeResult> {
    const result: CascadeResult = {
      totalScore: 0,
      comboCount: 1,
      gemsCleared: 0
    };

    this.state = GameState.CASCADE;

    const collisionResult = handleSpecialGemCollision(gem1, gem2, this.board);
    const gemsToRemove: Gem[] = [...collisionResult.triggeredGems];
    const chainSpecialGems: Gem[] = [...collisionResult.chainGems];
    let specialBaseScore = collisionResult.baseScore;
    const gemsToUpdate: Gem[] = [];

    for (const g of collisionResult.gemsToRemove) {
      if (!gemsToRemove.some(existing => existing.id === g.id)) {
        gemsToRemove.push(g);
      }
    }

    if (chainSpecialGems.length > 0) {
      const chainResult = processChainGems(chainSpecialGems, this.board);
      specialBaseScore += chainResult.totalChainScore;
      
      for (const g of chainResult.gemsToRemove) {
        if (!gemsToRemove.some(existing => existing.id === g.id)) {
          gemsToRemove.push(g);
        }
      }
    }

    const matchScore = this.calculateMatchScore(
      gemsToRemove.length,
      result.comboCount,
      true,
      specialBaseScore
    );
    result.totalScore += matchScore;
    result.gemsCleared += gemsToRemove.length;

    if (this.onScoreUpdate) {
      this.onScoreUpdate(matchScore, result.comboCount, gemsToRemove.length);
    }

    for (const gem of gemsToRemove) {
      this.board[gem.row][gem.col] = null;
    }

    const gemsToFall = this.findGemsToFall();
    const gemsToCreate = this.findGemsToCreate();

    if (this.onUpdate && !this.isSimulation) {
      await this.onUpdate(gemsToRemove, gemsToFall, gemsToCreate, gemsToUpdate);
    }

    this.applyGravity();
    
    for (const { gem } of gemsToCreate) {
      if (gem.row >= 0 && gem.row < BOARD_ROWS && 
          gem.col >= 0 && gem.col < BOARD_COLS &&
          this.board[gem.row][gem.col] === null) {
        this.board[gem.row][gem.col] = gem;
      }
    }
    
    this.fillBoard();

    const cascadeResult = await this.processMatches();
    result.totalScore += cascadeResult.totalScore;
    result.comboCount = Math.max(result.comboCount, cascadeResult.comboCount);
    result.gemsCleared += cascadeResult.gemsCleared;

    this.state = GameState.READY;
    
    if (!hasPossibleMoves(this.board)) {
      shuffleBoard(this.board);
      while (!hasPossibleMoves(this.board)) {
        shuffleBoard(this.board);
      }
    }

    return result;
  }

  async processMatches(): Promise<CascadeResult> {
    const result: CascadeResult = {
      totalScore: 0,
      comboCount: 0,
      gemsCleared: 0
    };

    this.state = GameState.CASCADE;

    while (true) {
      const matches = findAllMatches(this.board);
      
      if (matches.length === 0) {
        if (this.hasEmptySpaces()) {
          const gemsToFall = this.findGemsToFall();
          const gemsToCreate = this.findGemsToCreate();

          if (this.onUpdate && !this.isSimulation) {
            await this.onUpdate([], gemsToFall, gemsToCreate, []);
          }

          this.applyGravity();
          
          for (const { gem } of gemsToCreate) {
            if (gem.row >= 0 && gem.row < BOARD_ROWS && 
                gem.col >= 0 && gem.col < BOARD_COLS &&
                this.board[gem.row][gem.col] === null) {
              this.board[gem.row][gem.col] = gem;
            }
          }
          
          this.fillBoard();
          
          continue;
        } else {
          break;
        }
      }

      result.comboCount++;

      const gemsToRemove: Gem[] = [];
      const specialGemsToCreate: { gem: Gem; specialType: SpecialGemType }[] = [];
      const gemsToUpdate: Gem[] = [];
      const processedGems: Set<string> = new Set();
      const chainSpecialGems: Gem[] = [];
      let specialBaseScore = 0;
      let hasSpecialCollision = false;

      for (const match of matches) {
        const specialType = determineSpecialGemType([match]);
        
        const specialGemsInMatch = match.gems.filter(g => 
          g.specialType !== SpecialGemType.NONE && 
          !processedGems.has(g.id)
        );

        if (specialGemsInMatch.length >= 2) {
          hasSpecialCollision = true;
          for (let i = 0; i < specialGemsInMatch.length - 1; i++) {
            for (let j = i + 1; j < specialGemsInMatch.length; j++) {
              const gem1 = specialGemsInMatch[i];
              const gem2 = specialGemsInMatch[j];
              
              processedGems.add(gem1.id);
              processedGems.add(gem2.id);
              
              const collisionResult = handleSpecialGemCollision(gem1, gem2, this.board);
              specialBaseScore += collisionResult.baseScore;
              
              for (const g of collisionResult.gemsToRemove) {
                if (!gemsToRemove.some(existing => existing.id === g.id) && 
                    !processedGems.has(g.id)) {
                  gemsToRemove.push(g);
                }
              }
              
              for (const g of collisionResult.chainGems) {
                if (!chainSpecialGems.some(existing => existing.id === g.id)) {
                  chainSpecialGems.push(g);
                }
              }

              if (!gemsToRemove.some(g => g.id === gem1.id)) {
                gemsToRemove.push(gem1);
              }
              if (!gemsToRemove.some(g => g.id === gem2.id)) {
                gemsToRemove.push(gem2);
              }
            }
          }
        }

        for (const gem of match.gems) {
          if (processedGems.has(gem.id)) continue;
          processedGems.add(gem.id);
          
          if (gem.specialType === SpecialGemType.NONE) {
            if (!gemsToRemove.some(g => g.id === gem.id)) {
              gemsToRemove.push(gem);
            }
          } else {
            if (!hasSpecialCollision) {
              const specialGems = getGemsToRemoveBySpecialGem(gem, this.board);
              for (const sg of specialGems) {
                if (!gemsToRemove.some(g => g.id === sg.id) && !processedGems.has(sg.id)) {
                  if (sg.specialType !== SpecialGemType.NONE) {
                    chainSpecialGems.push(sg);
                  } else {
                    gemsToRemove.push(sg);
                  }
                }
              }
              specialBaseScore += getSpecialGemBaseScore(gem.specialType);
            }
            if (!gemsToRemove.some(g => g.id === gem.id)) {
              gemsToRemove.push(gem);
            }
          }
        }

        if (specialType !== SpecialGemType.NONE && match.length >= 4) {
          const centerGem = match.gems[Math.floor(match.gems.length / 2)];
          const existingSpecial = specialGemsToCreate.find(s => s.gem.id === centerGem.id);
          if (existingSpecial) {
            if (specialType === SpecialGemType.COLOR_BOMB) {
              existingSpecial.specialType = SpecialGemType.COLOR_BOMB;
            }
          } else {
            specialGemsToCreate.push({
              gem: centerGem,
              specialType
            });
          }
        }
      }

      if (chainSpecialGems.length > 0) {
        const chainResult = processChainGems(chainSpecialGems, this.board);
        specialBaseScore += chainResult.totalChainScore;
        
        for (const g of chainResult.gemsToRemove) {
          if (!gemsToRemove.some(existing => existing.id === g.id)) {
            gemsToRemove.push(g);
          }
        }
      }

      const filteredSpecialGems = specialGemsToCreate;

      const hasSpecial = specialBaseScore > 0 || 
        gemsToRemove.some(g => g.specialType !== SpecialGemType.NONE);
      
      const matchScore = this.calculateMatchScore(
        gemsToRemove.length,
        result.comboCount,
        hasSpecial,
        specialBaseScore
      );
      result.totalScore += matchScore;
      result.gemsCleared += gemsToRemove.length;

      if (this.onScoreUpdate) {
        this.onScoreUpdate(matchScore, result.comboCount, gemsToRemove.length);
      }

      for (const gem of gemsToRemove) {
        this.board[gem.row][gem.col] = null;
      }

      for (const { gem, specialType } of filteredSpecialGems) {
        const updatedGem = convertToSpecialGem(gem, specialType);
        this.board[gem.row][gem.col] = updatedGem;
        const removeIndex = gemsToRemove.findIndex(g => g.id === gem.id);
        if (removeIndex !== -1) {
          gemsToRemove.splice(removeIndex, 1);
        }
        gemsToUpdate.push(updatedGem);
      }

      const gemsToFall = this.findGemsToFall();
      const gemsToCreate = this.findGemsToCreate();

      if (this.onUpdate && !this.isSimulation) {
        await this.onUpdate(gemsToRemove, gemsToFall, gemsToCreate, gemsToUpdate);
      }

      this.applyGravity();
      
      for (const { gem } of gemsToCreate) {
        if (gem.row >= 0 && gem.row < BOARD_ROWS && 
            gem.col >= 0 && gem.col < BOARD_COLS &&
            this.board[gem.row][gem.col] === null) {
          this.board[gem.row][gem.col] = gem;
        }
      }
      
      this.fillBoard();
    }

    this.state = GameState.READY;
    
    if (!hasPossibleMoves(this.board)) {
      shuffleBoard(this.board);
      while (!hasPossibleMoves(this.board)) {
        shuffleBoard(this.board);
      }
    }

    return result;
  }

  private calculateMatchScore(
    gemCount: number,
    combo: number,
    hasSpecial: boolean,
    specialBaseScore: number = 0
  ): number {
    let score = gemCount * SCORE_PER_GEM + specialBaseScore;
    
    if (combo > 1) {
      score = Math.floor(score * Math.pow(SCORE_PER_COMBO_MULTIPLIER, combo - 1));
    }
    
    if (hasSpecial) {
      score = Math.floor(score * SCORE_SPECIAL_GEM_MULTIPLIER);
    }
    
    return score;
  }

  private findGemsToFall(): { gem: Gem; targetRow: number }[] {
    const result: { gem: Gem; targetRow: number }[] = [];

    for (let col = 0; col < BOARD_COLS; col++) {
      let emptySpaces = 0;
      
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        const gem = this.board[row][col];
        
        if (gem === null) {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          result.push({
            gem,
            targetRow: row + emptySpaces
          });
        }
      }
    }

    return result;
  }

  private findGemsToCreate(): { gem: Gem; startRow: number }[] {
    const result: { gem: Gem; startRow: number }[] = [];

    for (let col = 0; col < BOARD_COLS; col++) {
      let emptySpaces = 0;
      
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        if (this.board[row][col] === null) {
          emptySpaces++;
        }
      }

      for (let i = 0; i < emptySpaces; i++) {
        const startRow = -emptySpaces + i;
        const targetRow = i;
        const newGem = createGem(targetRow, col);
        result.push({ gem: newGem, startRow });
      }
    }

    return result;
  }

  private applyGravity(): void {
    for (let col = 0; col < BOARD_COLS; col++) {
      let writeRow = BOARD_ROWS - 1;
      
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        const gem = this.board[row][col];
        if (gem !== null) {
          if (row !== writeRow) {
            gem.row = writeRow;
            this.board[writeRow][col] = gem;
            this.board[row][col] = null;
          }
          writeRow--;
        }
      }
    }
  }

  private fillBoard(): void {
    for (let col = 0; col < BOARD_COLS; col++) {
      for (let row = 0; row < BOARD_ROWS; row++) {
        if (this.board[row][col] === null) {
          this.board[row][col] = createGem(row, col);
        }
      }
    }
  }

  removeGem(gem: Gem): void {
    this.board[gem.row][gem.col] = null;
  }

  shuffle(): void {
    shuffleBoard(this.board);
    while (!hasPossibleMoves(this.board)) {
      shuffleBoard(this.board);
    }
  }

  hasPossibleMoves(): boolean {
    return hasPossibleMoves(this.board);
  }

  reset(): void {
    this.board = createInitialBoard();
    this.state = GameState.READY;
    this.selectedGem = null;
    
    while (!hasPossibleMoves(this.board)) {
      shuffleBoard(this.board);
      this.board = createInitialBoard();
    }
  }

  resetForTest(): void {
    this.board = createInitialBoard();
    this.state = GameState.READY;
    this.selectedGem = null;
    
    this.placeTestSpecialGems();
  }

  private placeTestSpecialGems(): void {
    if (BOARD_ROWS >= 4 && BOARD_COLS >= 5) {
      const gem1 = this.board[1][1];
      if (gem1) {
        this.board[1][1] = {
          ...gem1,
          specialType: SpecialGemType.STRIPED_HORIZONTAL
        };
      }
      
      const gem2 = this.board[1][3];
      if (gem2) {
        this.board[1][3] = {
          ...gem2,
          specialType: SpecialGemType.STRIPED_VERTICAL
        };
      }
      
      const gem3 = this.board[3][1];
      if (gem3) {
        this.board[3][1] = {
          ...gem3,
          specialType: SpecialGemType.WRAPPED
        };
      }
      
      const gem4 = this.board[3][3];
      if (gem4) {
        this.board[3][3] = {
          ...gem4,
          specialType: SpecialGemType.COLOR_BOMB
        };
      }
    }
  }
}
