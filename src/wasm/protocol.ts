export {
  normalizeQueryFiles,
  resolveMarkerUri,
  rootUriFromDocumentUri,
} from './files.js'
export { stringifyHover, normalizeHoverRange } from './hover.js'
export { normalizeCompletionItems } from './completion.js'
export { normalizeDiagnostic } from './diagnostic.js'
export { getConfigurationItems } from './configuration.js'
export { throwIfLspError } from './errors.js'
