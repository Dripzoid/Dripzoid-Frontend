// src/components/ColorDisplay.jsx
import React, { useEffect, useState } from "react";
import { SketchPicker } from "react-color";
import nearestColor from "nearest-color";

// (You can keep the helper functions resolveColor/getNearestColorLabel from your original file)
// For brevity this file expects those helpers to be exported from a helpers file or redefined here.
// If you prefer, copy the existing helper functions into this file.

export default function ColorDisplay({ color, resolveColor, getNearestColorLabel }) {
  const name = typeof color === "string" ? color : (color && (color.label || color.name)) || String(color || "");
  const final = resolveColor ? resolveColor(color) : (typeof color === "string" ? color : "#808080");
  const nearestLabel = getNearestColorLabel ? getNearestColorLabel(color) : final;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState(final);

  useEffect(() => {
    setPickerColor(final);
  }, [final]);

  return (
    <div className="flex items-center gap-3 ml-2 relative">
      <button onClick={() => setPickerOpen((s) => !s)} aria-label={`Color ${name}`} type="button" className="p-0 border-0">
        <div aria-hidden style={{ backgroundColor: final, width: 20, height: 20, borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)" }} title={final} />
      </button>

      <div className="text-xs text-gray-600 dark:text-gray-300 leading-none">
        <div className="leading-none">{String(name)}</div>
        <div className="text-[11px] leading-none">{String(final).toUpperCase()} • {nearestLabel}</div>
      </div>

      {pickerOpen && (
        <div className="absolute z-40 top-full right-0 mt-2">
          <div className="bg-white dark:bg-gray-900 p-2 rounded shadow">
            <SketchPicker
              color={pickerColor}
              onChange={(col) => setPickerColor(col.hex)}
              onChangeComplete={(col) => setPickerColor(col.hex)}
            />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setPickerOpen(false)} className="px-3 py-1 rounded border bg-white dark:bg-gray-800 text-black dark:text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
