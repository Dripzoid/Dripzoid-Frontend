import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar
 * - Uses 250 ms debounce to avoid spamming API calls
 * - Keeps input fully responsive (no focus loss)
 * - Syncs external `initial` value when not focused
 */
const ProductSearchBar = React.memo(function ProductSearchBar({
  initial = "",
  onDebounced,
  inputRef,
}) {
  const [localValue, setLocalValue] = useState(initial);
  const internalRef = useRef(null);
  const elRef = inputRef || internalRef;

  const debounceTimeout = useRef(null);

  // Sync external `initial` value only if not focused
  useEffect(() => {
    const el = elRef.current;
    const isFocused =
      typeof document !== "undefined" && el === document.activeElement;
    if (!isFocused && initial !== localValue) {
      setLocalValue(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, elRef]);

  function handleChange(e) {
    const v = e.target.value;
    setLocalValue(v);

    // Debounce API trigger
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      try {
        onDebounced && onDebounced(v);
      } catch (err) {
        console.error("Debounce handler error:", err);
      }
    }, 250); // 250 ms debounce
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(debounceTimeout.current);
  }, []);

  return (
    <div className="relative w-full">
      <input
        ref={elRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder="Search products (name, id, sku, description, tags)"
        autoComplete="off"
        className="w-full pl-12 pr-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none"
        aria-label="Search products"
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60 w-4 h-4" />
    </div>
  );
});

export default ProductSearchBar;
