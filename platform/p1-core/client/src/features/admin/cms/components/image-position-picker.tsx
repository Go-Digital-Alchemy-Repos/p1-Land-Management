import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crosshair } from "lucide-react";

interface ImagePositionPickerProps {
  imageUrl: string;
  positionX: number;
  positionY: number;
  onPositionChange: (x: number, y: number) => void;
}

const PRESETS = [
  { label: "Top Left", x: 0, y: 0 },
  { label: "Top", x: 50, y: 0 },
  { label: "Top Right", x: 100, y: 0 },
  { label: "Left", x: 0, y: 50 },
  { label: "Center", x: 50, y: 50 },
  { label: "Right", x: 100, y: 50 },
  { label: "Bottom Left", x: 0, y: 100 },
  { label: "Bottom", x: 50, y: 100 },
  { label: "Bottom Right", x: 100, y: 100 },
];

export function ImagePositionPicker({
  imageUrl,
  positionX,
  positionY,
  onPositionChange,
}: ImagePositionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calcPosition = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
      onPositionChange(x, y);
    },
    [onPositionChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      calcPosition(e.clientX, e.clientY);
    },
    [calcPosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      calcPosition(e.clientX, e.clientY);
    },
    [isDragging, calcPosition],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-2" data-testid="image-position-picker">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <Crosshair className="h-3 w-3" />
        Image Focal Point
      </Label>
      <div
        ref={containerRef}
        className="relative w-full h-32 rounded-md border overflow-hidden cursor-crosshair select-none touch-none"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: `${positionX}% ${positionY}%`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        data-testid="image-position-picker-area"
      >
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${positionX}%`, top: `${positionY}%` }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-white shadow-md" />
          <div className="absolute inset-[5px] rounded-full bg-white shadow-sm" />
        </div>
        <div
          className="absolute left-0 right-0 h-px bg-white/40 pointer-events-none"
          style={{ top: `${positionY}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none"
          style={{ left: `${positionX}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant={positionX === preset.x && positionY === preset.y ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px] px-1"
            onClick={() => onPositionChange(preset.x, preset.y)}
            data-testid={`position-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        {positionX}% x {positionY}%
      </p>
    </div>
  );
}
