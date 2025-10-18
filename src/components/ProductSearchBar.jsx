import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar
 * - Self-contained input state (localValue)
 * - Debounces only the call to onDebounced (which triggers backend fetch)
 * - Preserves caret/selection and handles IME composition
 * - Does not blur or force focus changes
 *
 * Usage:
 * import ProductSearchBar from './components/ProductSearchBar';
 * <ProductSearchBar onDebounced={onSearchDebounced} debounceMs={250} ref={searchRef} />
 */
const ProductSearchBar = React.memo(
  React.forwardRef(function ProductSearchBar(
    { initial = undefined, onDebounced, debounceMs = 250, ...props },
    forwardedRef
  ) {
    // localValue is fully controlled inside this component to avoid parent re-renders stomping keystrokes.
    const [localValue, setLocalValue] = useState(typeof initial === "string" ? initial : "");
    const internalRef = useRef(null);
    // Use the forwarded ref object if provided, otherwise the internalRef.
    const elRef = forwardedRef || internalRef;

    // Keep a ref to remember whether we've applied an "initial" once; this avoids re-syncing on every parent update.
    const initialAppliedRef = useRef(false);

    const selectionRef = useRef({ start: null, end: null, direction: null });
    const debounceRef = useRef(null);
    const isComposingRef = useRef(false);

    // If the parent passes an explicit `initial` string and we haven't applied it yet,
    // set it once (but only when input is not focused / composing).
    useEffect(() => {
      if (typeof initial !== "string") return;
      if (initialAppliedRef.current) return;
      const el = elRef.current;
      const isFocused = typeof document !== "undefined" && el === document.activeElement;
      if (!isFocused && !isComposingRef.current) {
        setLocalValue(initial);
        initialAppliedRef.current = true;
      }
      // do not include elRef in deps intentionally
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    // change handler
    const handleChange = useCallback((e) => {
      const el = e.target;
      const v = el.value;

      // capture selection (caret) to restore after parent updates
      try {
        if (el && typeof el.selectionStart === "number") {
          selectionRef.current = {
            start: el.selectionStart,
            end: el.selectionEnd,
            direction: el.selectionDirection || "none",
          };
        }
      } catch {
        selectionRef.current = { start: null, end: null, direction: null };
      }

      setLocalValue(v);

      // if composing (IME), skip debounced send — flush after composition end
      if (isComposingRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          onDebounced && onDebounced(v);
        } catch (err) {
          // ignore parent errors
        } finally {
          debounceRef.current = null;
        }
      }, debounceMs);
    }, [debounceMs, onDebounced]);

    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }, []);

    const handleCompositionEnd = useCallback((e) => {
      isComposingRef.current = false;
      // capture selection after composition end
      try {
        const el = elRef.current;
        if (el && typeof el.selectionStart === "number") {
          selectionRef.current = {
            start: el.selectionStart,
            end: el.selectionEnd,
            direction: el.selectionDirection || "none",
          };
        }
      } catch {}
      // flush immediately (composition just finished)
      try {
        onDebounced && onDebounced(e.target.value);
      } catch {}
    }, [onDebounced]);

    // restore selection synchronously after localValue changes
    useLayoutEffect(() => {
      if (isComposingRef.current) return;
      const sel = selectionRef.current;
      const el = elRef.current;
      if (el && sel && sel.start != null && typeof el.setSelectionRange === "function") {
        try {
          const max = el.value.length;
          const start = Math.max(0, Math.min(sel.start, max));
          const end = Math.max(0, Math.min(sel.end ?? start, max));
          el.setSelectionRange(start, end, sel.direction === "forward" ? "forward" : "none");
        } catch {
          // ignore selection restore failures
        }
      }
    }, [localValue, elRef]);

    // cleanup debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
      };
    }, []);

    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={elRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="Search products (name, id, sku, description, tags)"
          autoComplete="off"
          className="w-full pl-12 pr-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none"
          aria-label="Search products"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60 w-4 h-4" />
      </div>
    );
  })
);

export default ProductSearchBar;
