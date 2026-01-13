import { AircraftData } from '../types';

interface ContextMenuProps {
    aircraft: AircraftData | null;
    x: number;
    y: number;
    isAssumed: boolean;
    onAssume: () => void;
    onClose: () => void;
}

export default function ContextMenu({ aircraft, x, y, isAssumed, onAssume, onClose }: ContextMenuProps) {
    if (!aircraft) return null;

    return (
        <div 
            className="context-menu-overlay"
            onClick={onClose}
        >
            <div 
                className="context-menu"
                style={{
                    position: 'fixed',
                    left: x,
                    top: y,
                    pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    className="context-menu-item"
                    onClick={onAssume}
                >
                    {isAssumed ? 'UNASSUME' : 'ASSUME'}
                </button>
            </div>
        </div>
    );
}
