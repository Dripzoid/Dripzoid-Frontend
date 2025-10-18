// src/components/ProductSearchBar.jsx
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar
 * - Self-contained input state (localValue) so parent renders don't stomp keystrokes
 * - Debounces only the call to onDebounced (which triggers backend fetch)
 * - Preserves caret/selection and handles IME composition (no accidental blur)
 * - Does not change focus or force selection
 *
 * Usage:
 * import ProductSearchBar from './components/ProductSearchBar';
 * <ProductSearchBar initial={debouncedQuery} onDebounced={onSearchDebounced} debounceMs={250} ref={searchRef} />
 */

const ProductSearchBar = React.memo(
  React.forwardRef(function ProductSearchBar(
    { initial = "", onDebounced, debounceMs = 250, ...props },
    forwardedRef
  ) {
    // local value state so parent re-renders won't stomp keystrokes
    const [localValue, setLocalValue] = useState(initial);

    // always use an internal ref for DOM access
    const innerRef = useRef(null);

    // mirror innerRef.current into forwardedRef (supports function refs and object refs)
    useEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(innerRef.current);
        return () => forwardedRef(null);
      } else {
        // object ref
        forwardedRef.current = innerRef.current;
        return () => {
          try {
            forwardedRef.current = null;
          } catch {}
        };
      }
    }, [forwardedRef]);

    // selection save/restore for caret preservation
    const selectionRef = useRef({ start: null, end: null, direction: null });

    // debounce timer & composition flag
    const debounceRef = useRef(null);
    const isComposingRef = useRef(false);

    // Sync initial -> localValue only when input is NOT focused and not composing.
    useEffect(() => {
      const el = innerRef.current;
      const isFocused = typeof document !== "undefined" && el === document.activeElement;
      if (!isFocused && !isComposingRef.current && initial !== localValue) {
        setLocalValue(initial);
      }
      // intentionally not depending on localValue
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    // handle change events
    const handleChange = useCallback(
      (e) => {
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

        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          try {
            onDebounced && onDebounced(v);
          } catch (err) {
            // ignore parent errors
          } finally {
            debounceRef.current = null;
          }
        }, debounceMs);
      },
      [debounceMs, onDebounced]
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
        try {
          const el = innerRef.current;
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
          // prefer the element value (safer than e.target in some scenarios)
          const val = innerRef.current ? innerRef.current.value : e.target.value;
          onDebounced && onDebounced(val);
        } catch {}
      },
      [onDebounced]
    );

    // restore selection synchronously after localValue changes
    useLayoutEffect(() => {
      if (isComposingRef.current) return;
      const sel = selectionRef.current;
      const el = innerRef.current;
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
    }, [localValue]);

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
          ref={innerRef}
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
