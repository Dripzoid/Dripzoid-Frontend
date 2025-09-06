import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RECENT_KEY = "global_search_recent";
const MAX_RECENT = 8;

const API_BASE = process.env.REACT_APP_API_BASE;

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [highlight, setHighlight] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      setRecent(Array.isArray(saved) ? saved : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    let canceled = false;
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/products/search`, {
          params: { query: query.trim() },
        });
        if (!canceled) setResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Search error:", err);
        if (!canceled) setResults([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(id);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setHighlight(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (!showDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, -1));
      } else if (e.key === "Enter") {
        if (highlight >= 0 && results[highlight]) {
          openProduct(results[highlight]);
        } else if (query.trim()) {
          applyFullSearch();
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlight(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDropdown, highlight, results, query]);

  const saveRecent = (term) => {
    if (!term || !term.trim()) return;
    try {
      const list = [term.trim(), ...recent.filter((r) => r !== term.trim())].slice(0, MAX_RECENT);
      setRecent(list);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {}
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const openProduct = (product) => {
    saveRecent(query.trim() || product.name);
    setShowDropdown(false);
    navigate(`/product/${product.id}`);
  };

  const applyFullSearch = () => {
    if (!query.trim()) return;
    saveRecent(query.trim());
    setShowDropdown(false);
    navigate(`/search?search=${encodeURIComponent(query.trim())}`);
  };

  const onRecentClick = (term) => {
    setQuery(term);
    setShowDropdown(true);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-xl" ref={wrapperRef}>
      <div className="relative">
        {/* Search bar with black ring on focus and slight gray bg in light mode */}
        <div className="flex items-center rounded-full 
          bg-gray-50 dark:bg-gray-900 
          border border-gray-300 dark:border-gray-800 
          shadow-sm transition 
          focus-within:ring-2 focus-within:ring-offset-1 
          focus-within:ring-black dark:focus-within:ring-gray-700">
          
          {/* Left icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search size={18} className="text-gray-500 dark:text-gray-400" />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Here..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setHighlight(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-11 pr-10 py-2 rounded-full 
              bg-transparent outline-none 
              text-gray-900 dark:text-white 
              placeholder-gray-500"
            aria-label="Global product search"
          />

          {/* Clear (X) icon */}
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full 
                hover:bg-gray-200 dark:hover:bg-gray-800 transition"
              aria-label="Clear search"
            >
              <X size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-3 w-full 
          bg-white dark:bg-gray-900 
          border border-gray-200 dark:border-gray-800 
          rounded-2xl shadow-xl max-h-[420px] overflow-auto z-50 animate-fadeIn">
          
          <div className="p-2">
            {query.trim() ? (
              <div>
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{loading ? "Searching..." : `${results.length} results`}</span>
                  <button
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      inputRef.current?.focus();
                    }}
                    className="text-sm underline"
                  >
                    Clear
                  </button>
                </div>

                {results.length === 0 && !loading ? (
                  <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No results found
                  </p>
                ) : (
                  results.map((product, idx) => (
                    <div
                      key={product.id}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseLeave={() => setHighlight(-1)}
                      className={`flex items-center gap-3 p-3 rounded-lg 
                        hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer 
                        ${highlight === idx ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                      onClick={() => openProduct(product)}
                    >
                      <img
                        src={product.image || "https://via.placeholder.com/80"}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-md border border-gray-200 dark:border-gray-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium truncate text-gray-900 dark:text-white">
                            {product.name}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{product.category}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.subcategory}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Recent searches</span>
                  <button onClick={clearRecent} className="text-sm underline">Clear</button>
                </div>

                {recent.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">No recent searches</p>
                ) : (
                  recent.map((r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    >
                      <button
                        onClick={() => onRecentClick(r)}
                        className="text-left text-sm text-gray-900 dark:text-white truncate"
                      >
                        {r}
                      </button>
                      <button
                        onClick={() => {
                          const filtered = recent.filter((x) => x !== r);
                          setRecent(filtered);
                          localStorage.setItem(RECENT_KEY, JSON.stringify(filtered));
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        aria-label={`Remove ${r}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
