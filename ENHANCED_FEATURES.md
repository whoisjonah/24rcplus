# 24RC Enhanced Features

## New Features Added

### 1. Assume/Unassume System ✅
**Toggle:** Press `A` key  
**Function:** Hide all aircraft except those you have assumed (right-clicked)
- When enabled, only aircraft you've assumed (right-clicked their data block) will be visible
- All other aircraft disappear from the radar
- Perfect for focusing on your controlled traffic
- Toast notification shows current state: "Show only assumed: ON/OFF"

### 2. Hide Ground Traffic ✅
**Toggle:** Press `G` key  
**Function:** Hide all aircraft that are on the ground
- Filters out ground traffic automatically
- Only shows airborne aircraft
- Reduces clutter during busy ground operations
- Toast notification shows current state: "Hide ground traffic: ON/OFF"

### 3. Flight Plan Viewer ✅
**Trigger:** Double-click any aircraft data block  
**Features:**
- **Random Squawk Code Generation** - Each time you open a flight plan, a random 4-digit squawk (0000-7777) is generated
- **Aircraft Identification:**
  - Callsign
  - Aircraft type
  - Assigned squawk code (displayed prominently)
- **Current Status:**
  - Altitude (feet)
  - Heading (degrees)
  - Speed (IAS knots)
  - Ground speed (knots)
  - Airborne/On Ground status
- **Position Data:**
  - X/Y coordinates
- **Weather Information:**
  - Current wind conditions
- **Pilot Information:**
  - Player name

### 4. Assignment Panel ✅
**Trigger:** Right-click an assumed aircraft data block  
**Features:**

#### Current Status Display
Shows current aircraft parameters:
- Heading (degrees)
- Altitude (Flight Level)
- Speed (knots)

#### Heading Assignment
- Input field for heading (0-359°)
- Quick buttons:
  - +10° / -10°
  - +90° / -90°
- Assign button sends command

#### Altitude Assignment
- Input field for Flight Level (FL000-FL600)
- Quick buttons:
  - +1000ft / -1000ft
  - +5000ft / -5000ft
- Assign button sends climb/descend command

#### Speed Assignment
- Input field for speed (0-500 knots)
- Quick preset buttons:
  - 250 kts
  - 210 kts
  - 180 kts
  - 160 kts
- Assign button sends speed command

#### Assignment Feedback
- Each assignment displays a toast notification with the ATC instruction
- Example: "DAL123, fly heading 270°"
- Example: "UAL456, climb to FL350"
- Example: "AAL789, reduce speed 210 knots"

### 5. Show Fixes/Waypoints (Planned)
**Toggle:** Press `F` key  
**Status:** Framework ready, awaiting integration with aeronav data
- Will display navigation fixes from aeronav.space
- SIDs and STARs visualization
- Integration with https://drive.google.com/drive/folders/1LgaFuNboU7XOnN0sHTd53gWDJXO8K9RR

## Keyboard Shortcuts Summary

| Key | Function |
|-----|----------|
| `E` | Toggle Event/Main data source |
| `P` | Toggle Predicted Track Lines |
| `A` | **Toggle Show Only Assumed Aircraft** |
| `G` | **Toggle Hide Ground Traffic** |
| `F` | **Toggle Show Fixes** (coming soon) |

## Mouse Actions Summary

| Action | Function |
|--------|----------|
| Left-click & drag data block | Move data block |
| Right-click data block | Assume track (get more info) |
| **Double-click data block** | **Open Flight Plan Viewer** |
| **Right-click assumed aircraft** | **Open Assignment Panel** |
| Right-click & drag radar | Pan view |
| Scroll wheel | Zoom in/out |
| Double-click radar (not on aircraft) | Start distance measurement tool |

## Implementation Details

### Technology Stack
- **React 19.1.0** for modal components
- **TypeScript** for type safety
- **PixiJS 8.8.1** for radar rendering
- **CSS3** with animations and glassmorphism effects

### File Structure
```
src/
├── components/
│   ├── FlightPlanViewer.tsx     # Flight plan modal
│   ├── AssignmentPanel.tsx      # Assignment control modal
│   └── ModalManager.tsx         # React modal state management
├── config.ts                    # Enhanced with new toggle flags
└── main.ts                      # Updated with modal integration
```

### New Config Options
```typescript
{
    showPTL: boolean,              // Predicted track lines
    showOnlyAssumed: boolean,      // Hide non-assumed aircraft
    hideGroundTraffic: boolean,    // Hide ground aircraft
    showFixes: boolean,            // Show fixes/waypoints
    showSIDs: boolean,             // Show SID procedures
    showSTARs: boolean,            // Show STAR procedures
}
```

## Usage Examples

### Assume/Unassume Workflow
1. Right-click an aircraft data block to assume it
2. Press `A` to hide all non-assumed aircraft
3. Work with your assumed traffic only
4. Press `A` again to show all aircraft

### Assignment Workflow
1. Right-click an aircraft to assume it
2. Right-click again to open the Assignment Panel
3. Modify heading/altitude/speed as needed
4. Click "ASSIGN" to send the command
5. Toast notification confirms the instruction

### Flight Plan Review
1. Double-click any aircraft data block
2. Review all flight information
3. Note the assigned squawk code
4. Press X or click outside to close

## Future Enhancements

- [ ] Integration with aeronav.space chart data
- [ ] Display SID/STAR procedures on radar
- [ ] Show navigation fixes with labels
- [ ] Conflict alert system
- [ ] Handoff system between controllers
- [ ] Voice command integration
- [ ] Historical track playback
- [ ] Export session logs

## Notes

- All modal dialogs use React for smooth animations and state management
- Assignment commands are currently logged but can be extended to send to aircraft
- Squawk codes are randomly generated per flight plan view
- All filtering is client-side and does not affect other users
- Configuration is saved in memory (not persisted across sessions)

---

**Repository:** https://github.com/whoisjonah/24rcplus  
**Original 24RC:** https://github.com/HotDog640/24RC  
**Last Updated:** January 13, 2026  
**Version:** 0.2.0  
**Author:** Enhanced by whoisjonah
