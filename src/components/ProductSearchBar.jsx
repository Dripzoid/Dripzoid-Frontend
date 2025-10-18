// src/components/ProductSearchBar.jsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Search } from "lucide-react";

/**
 * ProductSearchBar (Stable Focus Version)
 * - Keeps cursor/focus stable during and after debouncing
 * - Handles IME input correctly
 * - Prevents parent re-renders from stealing focus
 */
const ProductSearchBar = React.memo(
  React.forwardRef(function ProductSearchBar(
    { initial = "", onDebounced, debounceMs = 250, ...props },
    forwardedRef
  ) {
    const [localValue, setLocalValue] = useState(initial);
    const inputRef = useRef(null);
    const internalRef = useRef(null);
    const debounceRef = useRef(null);
    const selectionRef = useRef({ start: null, end: null, direction: null });
    const isComposingRef = useRef(false);
    const isFocusedRef = useRef(false);

    // Merge refs properly
    useEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(inputRef.current);
      } else {
        forwardedRef.current = inputRef.current;
      }
    }, [forwardedRef]);

    // Track focus manually
    const handleFocus = () => {
      isFocusedRef.current = true;
    };
    const handleBlur = () => {
      isFocusedRef.current = false;
    };

    // Sync initial prop only when not focused
    useEffect(() => {
      const el = inputRef.current;
      if (!isFocusedRef.current && !isComposingRef.current && initial !== localValue) {
        setLocalValue(initial);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    // Input change handler
    const handleChange = (e) => {
      const el = e.target;
      const value = el.value;

      // Save selection for caret restore
      try {
        if (typeof el.selectionStart === "number") {
          selectionRef.current = {
            start: el.selectionStart,
            end: el.selectionEnd,
            direction: el.selectionDirection || "none",
          };
        }
      } catch {}

      setLocalValue(value);

      if (isComposingRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        return;
      }

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          onDebounced && onDebounced(value);
        } catch {}
      }, debounceMs);
    };

    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true;
      clearTimeout(debounceRef.current);
    }, []);

    const handleCompositionEnd = useCallback(
      (e) => {
        isComposingRef.current = false;
        const val = e.target.value;
        try {
          onDebounced && onDebounced(val);
        } catch {}
      },
      [onDebounced]
    );

    // Restore caret and focus after re-render
    useLayoutEffect(() => {
      const el = inputRef.current;
      if (!el) return;

      if (isFocusedRef.current && document.activeElement !== el) {
        el.focus({ preventScroll: true });
      }

      if (isComposingRef.current) return;

      const sel = selectionRef.current;
      if (sel.start != null && typeof el.setSelectionRange === "function") {
        try {
          const max = el.value.length;
          const start = Math.max(0, Math.min(sel.start, max));
          const end = Math.max(0, Math.min(sel.end ?? start, max));
          el.setSelectionRange(start, end, sel.direction);
        } catch {}
      }
    }, [localValue]);

    // Cleanup
    useEffect(() => {
      return () => clearTimeout(debounceRef.current);
    }, []);

    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={inputRef}
          type="text"
          value={localValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
