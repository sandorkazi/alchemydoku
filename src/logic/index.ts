// Alchemical helpers
export { getAlchemical, getAspect, isDirectOpposite } from './alchemicals';

// Mixing
export { mix, mixIngredients, potionResultsEqual, potionToString } from './mixer';

// World generation & filtering
export {
  generateAllWorlds,
  clearWorldCache,
  filterByClue,
  filterByMixing,
  filterByAspect,
  filterByAssignment,
  filterBySell,
  applyClues,
} from './worldSet';

// Deduction
export {
  deduceMixingResult,
  getPossibleResults,
  deduceAlchemical,
  getPossibleAlchemicals,
  deduceAspect,
  buildDeductionReport,
  getEliminatedCells,
} from './deducer';

// Sell validation
