// src/components/ProductSearchBar.jsx
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar
 * - Local controlled input so parent renders don't stomp keystrokes
 * - Debounces only the call to onDebounced (backend fetch)
 * - Preserves caret/selection and handles IME composition
 * - Restores focus if parent re-render temporarily removes it
 *
 * Props:
 * - initial: initial value (kept only when input NOT focused)
 * - onDebounced: (value) => void called after debounce or on composition end
 * - debounceMs: number (milliseconds)
 * - inputRef: optional external ref (object or function)
 * - forwarded ref supported (React.forwardRef)
 *
 * Usage:
 * import ProductSearchBar from "./components/ProductSearchBar";
 * <ProductSearchBar initial={q} onDebounced={cb} debounceMs={250} inputRef={searchRef} />
 */
const ProductSearchBar = React.memo(
  React.forwardRef(function ProductSearchBar(
    { initial = "", onDebounced, debounceMs = 250, inputRef: externalInputRef, ...props },
    forwardedRef
  ) {
    const [localValue, setLocalValue] = useState(initial);

    // internal ref that always points to the DOM input
    const internalRef = useRef(null);

    // helper to wire multiple refs (forwardedRef and optional inputRef prop) to the same element
    const setRefs = useCallback(
      (el) => {
        internalRef.current = el;

        // set forwarded ref (if provided via React.forwardRef)
        if (forwardedRef) {
          if (typeof forwardedRef === "function") forwardedRef(el);
          else forwardedRef.current = el;
        }

        // set inputRef prop (if passed)
        if (externalInputRef) {
          if (typeof externalInputRef === "function") externalInputRef(el);
          else externalInputRef.current = el;
        }
      },
      [forwardedRef, externalInputRef]
    );

    // caret/selection storage
    const selectionRef = useRef({ start: null, end: null, direction: null });
    const debounceTimerRef = useRef(null);
    const isComposingRef = useRef(false);
    const isFocusedRef = useRef(false);

    // Sync initial -> localValue only when input NOT focused and not composing
    useEffect(() => {
      const el = internalRef.current;
      const isFocused = typeof document !== "undefined" && el === document.activeElement;
      if (!isFocused && !isComposingRef.current && initial !== localValue) {
        setLocalValue(initial);
      }
      // intentionally not depending on localValue
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    // change handler (keeps local value stable)
    const handleChange = useCallback(
      (e) => {
        const el = e.target;
        const v = el.value;

        // capture selection for restoration
        try {
          if (typeof el.selectionStart === "number") {
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

        // if composing (IME) skip scheduled debounce and wait for compositionend
        if (isComposingRef.current) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          return;
        }

        // schedule debounce
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          try {
            onDebounced && onDebounced(v);
          } catch (err) {
            // ignore parent errors
          }
        }, debounceMs);
      },
      [debounceMs, onDebounced]
    );

    // focus/blur tracking to know when NOT to overwrite input value & to restore focus if lost
    const onFocus = useCallback(() => {
      isFocusedRef.current = true;
    }, []);
    const onBlur = useCallback(() => {
      isFocusedRef.current = false;
    }, []);

    // composition handlers for IME
    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }, []);

    const handleCompositionEnd = useCallback(
      (e) => {
        isComposingRef.current = false;

        // capture selection after composition end
        try {
          const el = internalRef.current;
          if (el && typeof el.selectionStart === "number") {
            selectionRef.current = {
              start: el.selectionStart,
              end: el.selectionEnd,
              direction: el.selectionDirection || "none",
            };
          }
        } catch {}

        // flush immediately
        try {
          onDebounced && onDebounced(e.target.value);
        } catch {}
      },
      [onDebounced]
    );

    // restore caret/selection & focus synchronously after render
    useLayoutEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      // If we believed the input was focused, but document.activeElement is not the input,
      // attempt to restore focus immediately (prevents brief blur due to parent re-render).
      if (isFocusedRef.current && document.activeElement !== el) {
        try {
          // keep page from scrolling to input when restoring focus
          el.focus && el.focus({ preventScroll: true });
        } catch {
          try {
            el.focus && el.focus();
          } catch {}
        }
      }

      // restore selection/caret if available and not composing
      if (isComposingRef.current) return;
      const sel = selectionRef.current;
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
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
      };
    }, []);

    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={setRefs}
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
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
