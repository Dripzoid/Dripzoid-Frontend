// src/components/ColorDisplay.jsx
import React, { useEffect, useState } from "react";
import { SketchPicker } from "react-color";
import tinycolor from "tinycolor2";

/**
 * ColorDisplay
 *
 * Props:
 * - color: string | object  — original color label/value
 * - resolveColor?: (color) => string  — returns a CSS color (hex/rgb) for given color input
 * - getNearestColorLabel?: (color) => string — optional helper to return a readable label
 * - onSelect?: (color | null) => void  — called when selection changes
 *
 * Behavior:
 * - Renders a rounded rectangle containing the color name (instead of a tiny swatch)
 * - Rectangle is filled with the resolved color and text color is chosen for contrast
 * - The color is "selected" by default on mount (selected state true) and `onSelect` is invoked with the color
 * - Clicking the rectangle toggles the picker (SketchPicker) and clicking the small check/selection toggles selection state
 */

export default function ColorDisplay({
  color,
  resolveColor,
  getNearestColorLabel,
  onSelect,
}) {
  const name =
    typeof color === "string"
      ? color
      : (color && (color.label || color.name)) || String(color || "");
  // fallback resolver using tinycolor
  const defaultResolveColor = (c) => {
    if (!c && c !== 0) return "#808080";
    try {
      const s = typeof c === "string" ? c : c?.hex ?? c?.value ?? String(c);
      const tc = tinycolor(String(s));
      if (tc.isValid()) return tc.toHexString();
    } catch {}
    return "#808080";
  };

  const final = (resolveColor ? resolveColor(color) : defaultResolveColor(color)) || defaultResolveColor(color);
  const nearestLabel = getNearestColorLabel ? getNearestColorLabel(color) : String(final).toUpperCase();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState(final);
  const [selected, setSelected] = useState(true); // selected by default

  useEffect(() => {
    setPickerColor(final);
  }, [final]);

  // notify parent on mount (selected by default)
  useEffect(() => {
    try {
      onSelect && onSelect(selected ? color : null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (e) {
      // ignore
    }
    // we intentionally do not add onSelect to deps to avoid repeated calls when parent changes
    // but keep selected & color in deps so changes are notified:
  }, []); // run only once on mount

  // Ensure we notify when toggling selection
  useEffect(() => {
    onSelect && onSelect(selected ? color : null);
  }, [selected, color, onSelect]);

  // choose readable text color depending on background
  const textColor = (() => {
    try {
      return tinycolor(pickerColor).isLight() ? "text-gray-900" : "text-white";
    } catch {
      return "text-white";
    }
  })();

  return (
    <div className="relative inline-flex items-start gap-3">
      {/* The rounded rectangle showing the color name */}
      <button
        type="button"
        onClick={() => setPickerOpen((s) => !s)}
        aria-expanded={pickerOpen}
        aria-label={`Open color picker for ${name}`}
        className={`flex items-center gap-3 px-3 py-1 rounded-full shadow-sm transition transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
        style={{
          background: pickerColor,
          border: `1px solid ${tinycolor(pickerColor).isLight() ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
        }}
      >
        <span className={`text-sm font-medium ${textColor} select-none`}>{String(name)}</span>
        <span className={`text-[11px] ${textColor} opacity-80`}>• {String(pickerColor).toUpperCase()}</span>
      </button>

      {/* Selection toggle (check icon) */}
      <button
        type="button"
        onClick={() => setSelected((s) => !s)}
        aria-pressed={selected}
        aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
        className={`flex items-center justify-center w-8 h-8 rounded-md border transition ${
          selected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700"
        } focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
        title={selected ? "Selected" : "Select"}
      >
        {selected ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </button>

      {/* Color picker popover */}
      {pickerOpen && (
        <div className="absolute z-50 top-full left-0 mt-2">
          <div className="bg-white dark:bg-gray-900 p-2 rounded shadow-lg">
            <SketchPicker
              color={pickerColor}
              onChange={(col) => {
                setPickerColor(col.hex);
              }}
              onChangeComplete={(col) => {
                setPickerColor(col.hex);
              }}
            />
            <div className="mt-2 flex items-center gap-2 justify-end">
              <button
                onClick={() => setPickerOpen(false)}
                className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility / label area */}
      <div className="sr-only" aria-hidden>
        {nearestLabel}
      </div>
    </div>
  );
}
