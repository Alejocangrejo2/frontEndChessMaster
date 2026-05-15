// ============================================
// EvalGraph.tsx — Gráfica de evaluación por movimiento
// ============================================
// Muestra la ventaja a lo largo de la partida como una gráfica SVG.
// Basado en el formato UCI de Stockfish:
//   - cp (centipawns): ventaja posicional
//   - mate N: mate forzado en N movimientos
//   - depth: profundidad de análisis alcanzada
//
// Referencia: https://github.com/official-stockfish/Stockfish
// UCI output: "info depth D score cp X" o "info depth D score mate N"

import React, { useMemo, useRef } from 'react';

interface EvalPoint {
  moveIndex: number;
  evalCp: number;      // Evaluation in centipawns (from white's perspective)
  classification?: string;
  san?: string;
}

interface EvalGraphProps {
  /** Array of evaluations per move (centipawns, white perspective) */
  evals: EvalPoint[];
  /** Currently selected move index (-1 = before game) */
  currentIndex: number;
  /** Callback when a point on the graph is clicked */
  onMoveClick: (index: number) => void;
}

// Convert centipawns to a bounded display value using sigmoid
// This maps: -Infinity..+Infinity → -MAX..+MAX with smooth scaling
// Stockfish cp values: typically -2000 to +2000, but can be larger
// Mate scores: represented as ±10000 (convention)
function cpToDisplay(cp: number): number {
  const MAX = 10; // Max display value (±10 pawns)
  // Sigmoid scaling: keeps values proportional but bounded
  const x = cp / 100; // Convert to pawns
  return MAX * (2 / (1 + Math.exp(-x / 3)) - 1);
}

// Format evaluation for tooltip display
function formatEval(cp: number): string {
  if (Math.abs(cp) >= 9900) {
    const mateIn = Math.ceil((10000 - Math.abs(cp)) / 10);
    return cp > 0 ? `M${mateIn}` : `-M${mateIn}`;
  }
  const pawns = cp / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

export const EvalGraph: React.FC<EvalGraphProps> = ({
  evals,
  currentIndex,
  onMoveClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, areaWhite, areaBlack, points, yScale } = useMemo(() => {
    if (evals.length === 0) {
      return { path: '', areaWhite: '', areaBlack: '', points: [], yScale: 10 };
    }

    const width = 100; // SVG viewBox width (percentage)
    const height = 100;
    const midY = height / 2;
    const yMax = 10; // Max display pawns

    const pts = evals.map((e, i) => {
      const x = (i / Math.max(evals.length - 1, 1)) * width;
      const displayVal = cpToDisplay(e.evalCp);
      // Invert Y: positive eval = above center (lower Y in SVG)
      const y = midY - (displayVal / yMax) * (midY * 0.9);
      return { x, y: Math.max(2, Math.min(height - 2, y)), ...e };
    });

    // Build SVG path
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Area paths (filled regions above/below center)
    const aW = `M 0 ${midY} ` +
      pts.map(p => `L ${p.x} ${Math.min(p.y, midY)}`).join(' ') +
      ` L ${pts[pts.length - 1]?.x ?? 0} ${midY} Z`;

    const aB = `M 0 ${midY} ` +
      pts.map(p => `L ${p.x} ${Math.max(p.y, midY)}`).join(' ') +
      ` L ${pts[pts.length - 1]?.x ?? 0} ${midY} Z`;

    return { path: pathD, areaWhite: aW, areaBlack: aB, points: pts, yScale: yMax };
  }, [evals]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || evals.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const moveIdx = Math.round(clickX * (evals.length - 1));
    const clampedIdx = Math.max(0, Math.min(evals.length - 1, moveIdx));
    onMoveClick(clampedIdx);
  };

  if (evals.length === 0) return null;

  const currentPoint = currentIndex >= 0 && currentIndex < points.length
    ? points[currentIndex]
    : null;

  return (
    <div className="eval-graph" title="Gráfica de evaluación — clic para navegar">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="eval-graph__svg"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Background grid */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--c-border, #333)" strokeWidth="0.3" />
        <line x1="0" y1="25" x2="100" y2="25" stroke="var(--c-border, #333)" strokeWidth="0.15" strokeDasharray="1,1" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="var(--c-border, #333)" strokeWidth="0.15" strokeDasharray="1,1" />

        {/* White advantage area (above center) */}
        <path d={areaWhite} fill="rgba(255,255,255,0.15)" />

        {/* Black advantage area (below center) */}
        <path d={areaBlack} fill="rgba(0,0,0,0.25)" />

        {/* Main evaluation line */}
        <path
          d={path}
          fill="none"
          stroke="var(--c-primary, #4ecdc4)"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Move dots — colored by classification */}
        {points.map((p, i) => {
          const cls = p.classification || 'good';
          let dotColor = 'var(--c-primary, #4ecdc4)';
          if (cls === 'blunder') dotColor = '#e74c3c';
          else if (cls === 'mistake') dotColor = '#e7943c';
          else if (cls === 'inaccuracy') dotColor = '#f1c40f';
          else if (cls === 'brilliant') dotColor = '#00c9ff';

          // Only show dots for notable moves (errors)
          if (cls !== 'blunder' && cls !== 'mistake' && cls !== 'inaccuracy' && cls !== 'brilliant') {
            return null;
          }

          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.2"
              fill={dotColor}
              stroke="#000"
              strokeWidth="0.3"
            />
          );
        })}

        {/* Current position indicator */}
        {currentPoint && (
          <>
            <line
              x1={currentPoint.x}
              y1="0"
              x2={currentPoint.x}
              y2="100"
              stroke="var(--c-primary, #4ecdc4)"
              strokeWidth="0.4"
              opacity="0.6"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="2"
              fill="var(--c-primary, #4ecdc4)"
              stroke="#fff"
              strokeWidth="0.5"
            />
          </>
        )}
      </svg>

      {/* Labels */}
      <div className="eval-graph__labels">
        <span className="eval-graph__label eval-graph__label--white">+{yScale}</span>
        <span className="eval-graph__label eval-graph__label--zero">0</span>
        <span className="eval-graph__label eval-graph__label--black">−{yScale}</span>
      </div>

      {/* Tooltip */}
      {currentPoint && (
        <div className="eval-graph__tooltip">
          {currentPoint.san && <strong>{currentPoint.san}</strong>}
          {' '}
          <span>{formatEval(currentPoint.evalCp)}</span>
        </div>
      )}
    </div>
  );
};
