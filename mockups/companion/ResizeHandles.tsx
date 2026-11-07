import { getCurrentWindow } from '@tauri-apps/api/window';
import { native } from './native';

const directions = ['North', 'NorthEast', 'East', 'SouthEast', 'South', 'SouthWest', 'West', 'NorthWest'] as const;
export function ResizeHandles({ onError }: { onError: (error: unknown) => void }) {
  if (!native) return null;
  return <>{directions.map((direction) => <div key={direction} aria-hidden="true" className={'resize-handle ' + direction} onMouseDown={(event) => {
    if (event.button !== 0) return;
    void getCurrentWindow().startResizeDragging(direction).catch(onError);
  }}/>)}</>;
}
