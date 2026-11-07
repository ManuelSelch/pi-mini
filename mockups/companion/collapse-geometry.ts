type Point = { x: number; y: number };
type Size = { width: number; height: number };

// Position/current size are physical; the requested size is logical.
export function bottomRightPosition(position: Point, current: Size, target: Size, scale: number): Point {
  return {
    x: Math.round(position.x + current.width - target.width * scale),
    y: Math.round(position.y + current.height - target.height * scale),
  };
}
