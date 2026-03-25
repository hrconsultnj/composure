import { Button } from "@/components/ui/button";

interface GraphControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function GraphControls({ zoom, onZoomIn, onZoomOut, onZoomReset }: GraphControlsProps) {
  return (
    <div className="fixed bottom-4 right-4 flex gap-1 z-10">
      <Button variant="outline" size="icon" onClick={onZoomOut} title="Zoom out">−</Button>
      <Button variant="outline" size="icon" onClick={onZoomReset} title={`Reset (${Math.round(zoom * 100)}%)`}>⟳</Button>
      <Button variant="outline" size="icon" onClick={onZoomIn} title="Zoom in">+</Button>
    </div>
  );
}
