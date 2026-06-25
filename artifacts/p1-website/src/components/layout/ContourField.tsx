interface ContourFieldProps {
  stroke: string;
  opacity?: number;
  className?: string;
}

/** Topographic contour-line motif used as a layered land texture. */
export function ContourField({ stroke, opacity = 0.5, className }: ContourFieldProps) {
  return (
    <svg
      aria-hidden
      className={className ?? "absolute inset-0 h-full w-full"}
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 800 600"
      fill="none"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <path
          key={i}
          d={`M-40 ${90 + i * 58} C 160 ${30 + i * 58}, 320 ${160 + i * 58}, 480 ${
            90 + i * 58
          } S 760 ${20 + i * 58}, 880 ${110 + i * 58}`}
          stroke={stroke}
          strokeWidth={i % 3 === 0 ? 1.4 : 0.8}
        />
      ))}
    </svg>
  );
}
