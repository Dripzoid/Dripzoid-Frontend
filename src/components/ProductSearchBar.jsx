import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar (uncontrolled input + debounced callback)
 *
 * - Uses an uncontrolled input (ref.current.value) to avoid parent re-renders
 *   affecting the DOM node and causing focus/caret loss.
 * - Debounces only the onDebounced callback (no focus/selection changes).
 * - Preserves caret/selection and handles IME composition.
 *
 * Usage:
 * import ProductSearchBar from "./ProductSearchBar";
 * <ProductSearchBar initial={debouncedQuery} onDebounced={onSearchDebounced} debounceMs={250} ref={searchRef} />
 */
function ProductSearchBarInner({ initial = "", onDebounced, debounceMs = 250, ...props }, forwardedRef) {
  const internalRef = useRef(null);
  const inputRef = internalRef; // input DOM node ref
  const debounceRef = useRef(null);
  const isComposingRef = useRef(false);
  const selectionRef = useRef({ start: null, end: null, direction: null });
  const lastInitialRef = useRef(initial);

  // expose DOM ref to parent if they forwarded one
  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === "function") {
      forwardedRef(inputRef.current);
      return () => forwardedRef(null);
    } else {
      forwardedRef.current = inputRef.current;
      return () => {
        forwardedRef.current = null;
      };
    }
  }, [forwardedRef]);

  // On mount: set input value to initial
  useEffect(() => {
    const el = inputRef.current;
    if (el && typeof el.value !== "undefined") {
      el.value = String(initial ?? "");
      lastInitialRef.current = initial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Sync initial -> input.value only when not focused and not composing
  useEffect(() => {
    const el = inputRef.current;
    const isFocused = typeof document !== "undefined" && el === document.activeElement;
    if (!isFocused && !isComposingRef.current && initial !== lastInitialRef.current) {
      // Update the DOM input value directly (uncontrolled)
      if (el) {
        el.value = String(initial ?? "");
      }
      lastInitialRef.current = initial;
    }
  }, [initial]);

  // Helper to capture selection/caret
  const captureSelection = useCallback(() => {
    try {
      const el = inputRef.current;
      if (el && typeof el.selectionStart === "number") {
        selectionRef.current = {
          start: el.selectionStart,
          end: el.selectionEnd,
          direction: el.selectionDirection || "none",
        };
      } else {
        selectionRef.current = { start: null, end: null, direction: null };
      }
    } catch {
      selectionRef.current = { start: null, end: null, direction: null };
    }
  }, []);

  // onChange/onInput handler (uncontrolled)
  const handleInput = useCallback(
    (e) => {
      // capture caret
      captureSelection();

      // if composing, don't schedule debounce
      if (isComposingRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        return;
      }

      // schedule debounce
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        try {
          onDebounced && onDebounced(value);
        } catch {
          // ignore parent callback errors
        }
      }, debounceMs);
    },
    [captureSelection, debounceMs, onDebounced]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const handleCompositionEnd = useCallback(
    (e) => {
      isComposingRef.current = false;
      // capture selection after composition end
      captureSelection();
      // flush immediately to parent
      try {
        onDebounced && onDebounced(e.target.value);
      } catch {}
    },
    [captureSelection, onDebounced]
  );

  // restore caret (in case code modifies input.value while focused)
  useLayoutEffect(() => {
    if (isComposingRef.current) return;
    const sel = selectionRef.current;
    const el = inputRef.current;
    if (el && sel && sel.start != null && typeof el.setSelectionRange === "function") {
      try {
        const max = (el.value && el.value.length) || 0;
        const start = Math.max(0, Math.min(sel.start, max));
        const end = Math.max(0, Math.min(sel.end ?? start, max));
        el.setSelectionRange(start, end, sel.direction === "forward" ? "forward" : "none");
      } catch {
        // ignore
      }
    }
  }); // run after every paint (keeps selection consistent)

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
        ref={inputRef}
        type="text"
        // uncontrolled: do NOT set value prop
        defaultValue={initial}
        onInput={handleInput}
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
}

const ProductSearchBar = React.memo(React.forwardRef(ProductSearchBarInner));
export default ProductSearchBar;
