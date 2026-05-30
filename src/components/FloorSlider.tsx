interface Props {
  floor: number
  maxFloor: number
  onChange: (floor: number) => void
}

export function FloorSlider({ floor, maxFloor, onChange }: Props) {
  return (
    <div className="floor-slider">
      <label>
        <span className="floor-label">Floor {floor}</span>
        <input
          type="range"
          min={1}
          max={maxFloor}
          value={floor}
          onChange={(e) => onChange(parseInt(e.target.value))}
          aria-label={`Floor ${floor} of ${maxFloor}`}
          aria-valuemin={1}
          aria-valuemax={maxFloor}
          aria-valuenow={floor}
        />
        <div className="floor-range">
          <span>1</span>
          <span>{maxFloor}</span>
        </div>
      </label>
    </div>
  )
}
