import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar (uncontrolled input — immediate callback, no debounce)
 *
 * - Uncontrolled input (defaultValue) so parent re-renders won't re-create the DOM node.
 * - Calls onDebounced (now immediate) on every user input (except during IME composition).
 * - Handles IME composition: flushes on compositionend.
 * - Captures & restores caret/selection to avoid accidental jumps.
 *
 * Usage:
 * import ProductSearchBar from "./ProductSearchBar";
 * <ProductSearchBar initial={query} onDebounced={handleQueryChange} ref={searchRef} />
 */
function ProductSearchBarInner({ initial = "", onDebounced, ...props }, forwardedRef) {
  const internalRef = useRef(null);
  const inputRef = internalRef; // DOM node ref
  const isComposingRef = useRef(false);
  const selectionRef = useRef({ start: null, end: null, direction: null });
  const lastInitialRef = useRef(initial);

  // expose DOM ref to parent if forwarded
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

  // On mount: set DOM value to initial
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
      if (el) {
        el.value = String(initial ?? "");
      }
      lastInitialRef.current = initial;
    }
  }, [initial]);

  // capture caret/selection
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

  // input handler: immediate callback (no debounce)
  const handleInput = useCallback(
    (e) => {
      captureSelection();

      // If composing (IME), don't call parent yet.
      if (isComposingRef.current) return;

      const value = e.target.value;
      try {
        onDebounced && onDebounced(value);
      } catch {
        // ignore parent errors
      }
    },
    [captureSelection, onDebounced]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
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

  // restore caret/selection after render
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
        // ignore selection restore failures
      }
    }
  }); // run after every paint to keep caret stable

  return (
    <div className="relative w-full">
      <input
        {...props}
        ref={inputRef}
        type="text"
        // uncontrolled input — defaultValue only
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
