import {
  Gem,
  GameState,
  SpecialGemType,
  CascadeResult,
  SpecialCombination,
  CombinationResult
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
  detectSpecialCombination,
  calculateCombinationEffect
} from './specialGems';

export type SwapCallback = (gem1: Gem, gem2: Gem, isSwapBack: boolean) => Promise<void>;

export type BoardUpdateCallback = (
  gemsToRemove: Gem[],
  gemsToFall: { gem: Gem; targetRow: number }[],
  gemsToCreate: { gem: Gem; startRow: number }[],
  gemsToUpdate: Gem[],
  combinationResult?: CombinationResult
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
  private isSimulation: boolean;

  constructor(simulation = false) {
    this.board = createInitialBoard();
    this.state = GameState.READY;
    this.selectedGem = null;
    this.onUpdate = null;
    this.onScoreUpdate = null;
    this.onSwap = null;
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

    const combination = detectSpecialCombination(gem1, gem2);
    if (combination !== SpecialCombination.NONE) {
      await this.processCombination(gem1, gem2, combination);
      return;
    }

    const matches = findAllMatches(this.board);

    if (matches.length === 0) {
      if (this.onSwap && !this.isSimulation) {
        await this.onSwap(gem1, gem2, true);
      }
      swapGems(this.board, gem1, gem2);
      this.state = GameState.READY;
      return;
    }

    await this.processMatches();
  }

  private async processCombination(
    gem1: Gem,
    gem2: Gem,
    _combination: SpecialCombination
  ): Promise<void> {
    const comboResult = calculateCombinationEffect(gem1, gem2, this.board);
    const gemsToRemove = comboResult.gemsToRemove;

    const matchScore = this.calculateCombinationScore(
      gemsToRemove.length,
      1,
      comboResult.scoreMultiplier
    );

    if (this.onScoreUpdate) {
      this.onScoreUpdate(matchScore, 1, gemsToRemove.length);
    }

    for (const gem of gemsToRemove) {
      if (this.board[gem.row][gem.col]?.id === gem.id) {
        this.board[gem.row][gem.col] = null;
      }
    }

    const gemsToFall = this.findGemsToFall();
    const gemsToCreate = this.findGemsToCreate();

    if (this.onUpdate && !this.isSimulation) {
      await this.onUpdate(gemsToRemove, gemsToFall, gemsToCreate, [], comboResult);
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
      let activeCombination: CombinationResult | undefined;

      const specialGemsInMatch: Gem[] = [];

      for (const match of matches) {
        const specialType = determineSpecialGemType([match]);

        for (const gem of match.gems) {
          if (gem.specialType === SpecialGemType.NONE) {
            if (!gemsToRemove.some(g => g.id === gem.id)) {
              gemsToRemove.push(gem);
            }
          } else {
            if (!specialGemsInMatch.some(g => g.id === gem.id)) {
              specialGemsInMatch.push(gem);
            }
            const specialGems = getGemsToRemoveBySpecialGem(gem, this.board);
            for (const sg of specialGems) {
              if (!gemsToRemove.some(g => g.id === sg.id)) {
                gemsToRemove.push(sg);
              }
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

      if (specialGemsInMatch.length >= 2) {
        for (let i = 0; i < specialGemsInMatch.length; i++) {
          for (let j = i + 1; j < specialGemsInMatch.length; j++) {
            const comb = detectSpecialCombination(specialGemsInMatch[i], specialGemsInMatch[j]);
            if (comb !== SpecialCombination.NONE) {
              const combResult = calculateCombinationEffect(specialGemsInMatch[i], specialGemsInMatch[j], this.board);
              activeCombination = combResult;
              for (const g of combResult.gemsToRemove) {
                if (!gemsToRemove.some(r => r.id === g.id)) {
                  gemsToRemove.push(g);
                }
              }
              break;
            }
          }
          if (activeCombination) break;
        }
      }

      const filteredSpecialGems = specialGemsToCreate;

      const matchScore = activeCombination
        ? this.calculateCombinationScore(
            gemsToRemove.length,
            result.comboCount,
            activeCombination.scoreMultiplier
          )
        : this.calculateMatchScore(
            gemsToRemove.length,
            result.comboCount,
            gemsToRemove.some(g => g.specialType !== SpecialGemType.NONE)
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
        await this.onUpdate(gemsToRemove, gemsToFall, gemsToCreate, gemsToUpdate, activeCombination);
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
    hasSpecial: boolean
  ): number {
    let score = gemCount * SCORE_PER_GEM;

    if (combo > 1) {
      score = Math.floor(score * Math.pow(SCORE_PER_COMBO_MULTIPLIER, combo - 1));
    }

    if (hasSpecial) {
      score = Math.floor(score * SCORE_SPECIAL_GEM_MULTIPLIER);
    }

    return score;
  }

  private calculateCombinationScore(
    gemCount: number,
    combo: number,
    combinationMultiplier: number
  ): number {
    let score = gemCount * SCORE_PER_GEM * SCORE_SPECIAL_GEM_MULTIPLIER;
    score = Math.floor(score * combinationMultiplier);

    if (combo > 1) {
      score = Math.floor(score * Math.pow(SCORE_PER_COMBO_MULTIPLIER, combo - 1));
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
    if (BOARD_ROWS >= 5 && BOARD_COLS >= 5) {
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

      const gem5 = this.board[5][1];
      if (gem5) {
        this.board[5][1] = {
          ...gem5,
          specialType: SpecialGemType.WRAPPED
        };
      }

      const gem6 = this.board[5][3];
      if (gem6) {
        this.board[5][3] = {
          ...gem6,
          specialType: SpecialGemType.STRIPED_HORIZONTAL
        };
      }
    }
  }
}
