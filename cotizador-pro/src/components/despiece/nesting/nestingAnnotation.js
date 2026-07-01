// ── Shared annotation logic for NestingSheetPreview + NestingExportSheet ──
// Both components use these pure functions to decide what labels/dimensions
// to show. Only the skin (colors, borders, patterns) differs per renderer.

/**
 * Derive a short alias from a full label string.
 * Tries to extract a code pattern like "ABC123" first;
 * falls back to the first word, truncated to 8 chars.
 * Mirrors NestingSheetPreview logic exactly.
 */
export function deriveShortAlias(fullLabelSource) {
  if (!fullLabelSource) return '';
  const codeMatch = fullLabelSource.match(/^[A-Za-z]{1,4}\d{1,4}[A-Za-z0-9-]*/)?.[0];
  if (codeMatch) return codeMatch.toUpperCase();
  const prefix = fullLabelSource.split(/[\s,;:.()[\]{}]+/).filter(Boolean)[0] || '';
  return prefix.slice(0, 8).toUpperCase();
}

/**
 * Visibility gate for secondary labels (dimensions, rect labels, etc.).
 * Export always passes currentZoom=1; Preview passes the live zoom state.
 */
export function canShowSecondaryLabel({
  primaryPx, crossPx, minPrimaryPx, minCrossPx, minZoom = 1, currentZoom = 1,
}) {
  return currentZoom >= minZoom && primaryPx >= minPrimaryPx && crossPx >= minCrossPx;
}

/* ── Internal helpers ── */

function estimateTextWidth(text, fontPx) {
  return text.length * fontPx * 0.58;
}

/* ── Piece annotation thresholds (screen px) ── */
const MIN_FULL_LABEL_W = 78;
const MIN_FULL_LABEL_H = 36;
const MIN_SHORT_LABEL_W = 36;
const MIN_SHORT_LABEL_H = 16;
const MIN_DIM_W = 30;
const MIN_DIM_H = 28;
const MIN_VERTICAL_LABEL_W = 18;
const MIN_VERTICAL_LABEL_H = 24;

/**
 * Compute all piece-level annotation visibility and sizing decisions.
 * Pure function — rendering colours, borders, and canto patterns are up
 * to the caller (skin layer).
 *
 * Returns a plain object. Destructure only the fields you need.
 */
export function computePieceAnnotation({
  pieceWidth,
  pieceHeight,
  screenW,
  screenH,
  isVertical,
  fullLabelSource,
  currentScale,
  currentZoom = 1,
}) {
  /* ── classification ── */
  const isMiniPiece =
    screenH < 24 || (!isVertical && screenW < 60) || (isVertical && screenW < 28);
  const isSub100Piece = Math.min(pieceWidth, pieceHeight) < 100;

  /* ── alias ── */
  const shortAlias = deriveShortAlias(fullLabelSource);

  /* ── label tier visibility ── */
  const canShowFullLabel =
    !isMiniPiece && screenW >= MIN_FULL_LABEL_W && screenH >= MIN_FULL_LABEL_H;
  const canShowShortLabel =
    screenW >= MIN_SHORT_LABEL_W && screenH >= MIN_SHORT_LABEL_H;
  const canShowVerticalLabel =
    isVertical && screenW >= MIN_VERTICAL_LABEL_W && screenH >= MIN_VERTICAL_LABEL_H;
  const canShowVerticalFullLabel =
    isVertical && !isMiniPiece && screenW >= 26 && screenH >= 96;

  /* ── dimension visibility (sub-100 uses relaxed thresholds) ── */
  const showHorizontalDim = canShowSecondaryLabel({
    primaryPx: screenW,
    crossPx: screenH,
    minPrimaryPx: isSub100Piece ? 24 : MIN_DIM_W,
    minCrossPx: isSub100Piece ? 10 : 18,
    minZoom: 0.95,
    currentZoom,
  });
  const showVerticalDim = canShowSecondaryLabel({
    primaryPx: screenH,
    crossPx: screenW,
    minPrimaryPx: isSub100Piece ? 24 : MIN_DIM_H,
    minCrossPx: isSub100Piece ? 10 : 18,
    minZoom: 0.95,
    currentZoom,
  });

  /* ── dynamic font sizes ── */
  const maxLabelSize = Math.min(pieceWidth, pieceHeight) * 0.55;
  const targetLabelSize = (isMiniPiece ? 10 : 12) / currentScale;
  const labelFontSize = Math.max(
    (isMiniPiece ? 3 : 3.5) / currentScale,
    Math.min(maxLabelSize, targetLabelSize),
  );

  const maxDimSize = Math.min(pieceWidth, pieceHeight) * 0.4;
  const targetDimSize = (isMiniPiece ? 9 : 11) / currentScale;
  const dimFontSize = Math.max(
    (isMiniPiece ? 2.8 : 3) / currentScale,
    Math.min(maxDimSize, targetDimSize),
  );
  const dimEdgeInset = Math.max(2 / currentScale, dimFontSize + 2 / currentScale);

  /* ── centre-fit check (accounts for side dimension labels) ── */
  const projectedRightDimWidth = showHorizontalDim
    ? Math.max(18, dimFontSize * currentScale * 3.2)
    : 0;
  const projectedLeftDimWidth = showVerticalDim
    ? Math.max(14, dimFontSize * currentScale * 1.8)
    : 0;
  const centerAvailablePx = Math.max(
    0,
    screenW - projectedLeftDimWidth - projectedRightDimWidth - 10,
  );
  const fullLabelFitsCenter =
    estimateTextWidth(fullLabelSource, labelFontSize * currentScale) <=
    centerAvailablePx;
  const shortLabelFitsCenter =
    estimateTextWidth(shortAlias, labelFontSize * currentScale) <=
    centerAvailablePx;

  /* ── final label decision ── */
  const pieceLabel = isMiniPiece
    ? canShowShortLabel
      ? shortAlias
      : ''
    : isVertical
      ? canShowVerticalFullLabel
        ? fullLabelSource
        : canShowVerticalLabel
          ? shortAlias
          : ''
      : canShowFullLabel && fullLabelFitsCenter
        ? fullLabelSource
        : canShowShortLabel && shortLabelFitsCenter
          ? shortAlias
          : '';
  const isShortLabel = Boolean(pieceLabel) && pieceLabel !== fullLabelSource;

  /* ── show dimension value ── */
  const showDimValue = isSub100Piece
    ? true
    : canShowFullLabel || canShowShortLabel || canShowVerticalLabel || canShowVerticalFullLabel;

  /* ── dimension placement ── */
  const placeHorizontalDimAtRight = showHorizontalDim;
  const verticalDimInset = isVertical
    ? `${Math.max(12, dimFontSize * 1.6)}px`
    : `${isMiniPiece ? 1 : 2 / currentScale}px`;

  /* ── canto visibility (uses same threshold as short label) ── */
  const showCanto =
    screenW >= MIN_SHORT_LABEL_W && screenH >= MIN_SHORT_LABEL_H;

  return {
    // label
    pieceLabel,
    isShortLabel,
    shortAlias,
    fullLabelSource,

    // classification
    isMiniPiece,
    isSub100Piece,

    // dimension visibility
    showHorizontalDim,
    showVerticalDim,
    showDimValue,

    // fonts
    labelFontSize,
    dimFontSize,
    dimEdgeInset,

    // placement
    placeHorizontalDimAtRight,
    verticalDimInset,

    // canto
    showCanto,
  };
}

/**
 * Compute free-rect annotation decisions.
 */
export function computeFreeRectAnnotation({ screenW, screenH, currentZoom = 1 }) {
  const showWidthLabel = canShowSecondaryLabel({
    primaryPx: screenW,
    crossPx: screenH,
    minPrimaryPx: 64,
    minCrossPx: 18,
    minZoom: 0.9,
    currentZoom,
  });
  const showHeightLabel = canShowSecondaryLabel({
    primaryPx: screenH,
    crossPx: screenW,
    minPrimaryPx: 64,
    minCrossPx: 18,
    minZoom: 0.9,
    currentZoom,
  });
  return { showWidthLabel, showHeightLabel };
}
