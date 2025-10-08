// src/components/Reviews.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Card, CardContent, Typography } from "@mui/material";
import { ThumbsUp, ThumbsDown, Send, Trash2, Paperclip } from "lucide-react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import useUploader from "../hooks/useUploader"; // keep your hook
// envs
const DEFAULT_API_BASE = process.env.REACT_APP_API_BASE;
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const READ_MORE_LIMIT = 280;
const MAX_FILES = 6;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB
const PAGE_SIZE = 6;

const BUTTON_CLASS =
  "shadow-[inset_0_0_0_2px_#616467] text-black px-3 py-2 rounded text-sm flex items-center gap-2 bg-transparent hover:bg-[#616467] hover:text-white dark:text-neutral-200 transition duration-200";

function ReadMore({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= READ_MORE_LIMIT) return <div className="text-black dark:text-white">{text}</div>;
  return (
    <div className="text-sm leading-relaxed">
      <div className="text-black dark:text-white">{open ? text : text.slice(0, READ_MORE_LIMIT) + "..."}</div>
      <button onClick={() => setOpen((s) => !s)} className="mt-2 text-xs underline decoration-black/50 dark:decoration-white/50" type="button" aria-expanded={open}>
        {open ? "Read less" : "Read more"}
      </button>
    </div>
  );
}

function Lightbox({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="max-w-[95vw] max-h-[95vh]">
        {item.type === "image" ? (
          // eslint-disable-next-line
          <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain rounded" />
        ) : (
          <video src={item.url} controls className="max-w-full max-h-full rounded" />
        )}
      </div>
      <button onClick={onClose} className="absolute top-6 right-6 text-white text-xl" type="button" aria-label="Close lightbox">
        ✕
      </button>
    </div>
  );
}

function stringToHslColor(str = "", s = 65, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function StarDisplay({ value = 0, size = 16 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (value >= i) stars.push(<FaStar key={i} size={size} />);
    else if (value >= i - 0.5) stars.push(<FaStarHalfAlt key={i} size={size} />);
    else stars.push(<FaRegStar key={i} size={size} />);
  }
  return <div className="flex items-center gap-1 text-yellow-500">{stars}</div>;
}

function StarSelector({ value = 5, onChange, size = 20 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={() => onChange?.(i)}
          aria-label={`Set rating to ${i}`}
          type="button"
          className={`p-1 rounded-md ${value >= i ? "text-yellow-500" : "text-gray-400"}`}
        >
          {value >= i ? <FaStar size={size} /> : <FaRegStar size={size} />}
        </button>
      ))}
    </div>
  );
}

function formatRelativeTime(isoOrDate) {
  if (!isoOrDate) return "";
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return String(isoOrDate);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  try {
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return date.toLocaleString();
  }
}

// normalize payload helper (robust)
function normalizeReviewsPayload(payload) {
  if (!payload) return [];
  let arr = [];
  if (Array.isArray(payload)) arr = payload;
  else if (Array.isArray(payload.data)) arr = payload.data;
  else if (Array.isArray(payload.reviews)) arr = payload.reviews;
  else {
    try {
      const vals = Object.values(payload).filter((v) => v && typeof v === "object" && ("id" in v || "productId" in v));
      if (vals.length) arr = vals;
    } catch {
      arr = [];
    }
  }

  return arr.map((r) => {
    const clone = { ...r };
    clone.userName = clone.userName || clone.user_name || clone.username || clone.name || clone.fullName || clone.full_name || null;

    const imagesField = clone.imageUrls || clone.images || clone.media || clone.imageUrl || clone.image || null;
    let mediaArr = [];
    if (Array.isArray(imagesField)) mediaArr = imagesField;
    else if (typeof imagesField === "string" && imagesField.trim()) {
      try {
        const parsed = JSON.parse(imagesField);
        if (Array.isArray(parsed)) mediaArr = parsed;
        else if (typeof parsed === "string") mediaArr = [parsed];
        else mediaArr = [];
      } catch {
        mediaArr = imagesField.split(",").map((s) => s.trim()).filter(Boolean);
      }
    } else if (imagesField && typeof imagesField === "object" && imagesField.url) {
      mediaArr = [imagesField.url];
    }

    clone.media = (mediaArr || []).map((m) => {
      if (!m) return null;
      const url = (typeof m === "object" && m.url) ? m.url : String(m);
      const lower = url.split("?")[0].toLowerCase();
      const isVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(lower) || lower.includes("video") || lower.includes("/video/");
      return { url, type: isVideo ? "video" : "image", name: url.split("/").pop() };
    }).filter(Boolean);

    if (!clone.imageUrl && clone.media && clone.media.length > 0) clone.imageUrl = clone.media[0].url;

    clone.likes = typeof clone.likes === "number" ? clone.likes : (typeof clone.like === "number" ? clone.like : 0);
    clone.dislikes = typeof clone.dislikes === "number" ? clone.dislikes : (typeof clone.dislike === "number" ? clone.dislike : 0);
    clone.rating = Number(clone.rating ?? clone.stars ?? 0);

    return clone;
  });
}

export default function Reviews({ productId, apiBase = DEFAULT_API_BASE, currentUser = null, showToast = () => {} }) {
  // core state
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voteCache, setVoteCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vote_cache_v1") || "{}");
    } catch {
      return {};
    }
  });

  // UI state
  const [ratingFilter, setRatingFilter] = useState(null); // 1-5 or null
  const [sortOrder, setSortOrder] = useState("recent"); // recent | high | low
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [lightboxItem, setLightboxItem] = useState(null);

  // form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewPreviews, setReviewPreviews] = useState([]);
  const previewsRef = useRef([]);
  const [fileWarning, setFileWarning] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const toastTimerRef = useRef(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  function internalToast(msg, ttl = 4000) {
    try { showToast(msg); } catch {}
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => showToast(null), ttl);
  }

  // uploader hook
  const { upload, isUploading: uploaderBusy, error: uploaderError } = useUploader(apiBase, {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  });

  useEffect(() => {
    setUploadError(uploaderError || null);
    setIsUploadingFiles(Boolean(uploaderBusy));
  }, [uploaderBusy, uploaderError]);

  // fetch reviews
  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/reviews/product/${productId}`);
      if (!res.ok) {
        try { const t = await res.text(); console.warn("Reviews fetch failed:", t); } catch {}
        setLoading(false);
        return;
      }
      const json = await res.json();
      const normalized = normalizeReviewsPayload(json);
      setReviews(normalized);
    } catch (err) {
      console.warn("fetchReviews err", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!productId) return;
    fetchReviews();
    // cleanup blob urls on unmount
    return () => {
      try {
        (previewsRef.current || []).forEach((p) => { if (p && p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // overall metrics
  const overall = useMemo(() => {
    const arr = Array.isArray(reviews) ? reviews : [];
    const count = arr.length;
    const avg = count ? +(arr.reduce((a, r) => a + (Number(r.rating) || 0), 0) / count).toFixed(2) : 0;
    const hist = [5, 4, 3, 2, 1].map((s) => arr.filter((r) => Number(r.rating) === s).length);
    const total = hist.reduce((a, b) => a + b, 0) || 1;
    const pct = hist.map((c) => Math.round((c / total) * 100));
    return { avg, count, hist, pct };
  }, [reviews]);

  // filter + sort + pagination
  const filtered = useMemo(() => {
    const arr = Array.isArray(reviews) ? [...reviews] : [];
    const filteredByRating = ratingFilter ? arr.filter((r) => Number(r.rating) === Number(ratingFilter)) : arr;
    // sort
    if (sortOrder === "high") filteredByRating.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else if (sortOrder === "low") filteredByRating.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
    else filteredByRating.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
    return filteredByRating;
  }, [reviews, ratingFilter, sortOrder]);

  const visibleReviews = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  // optimistic vote handling
  function toggleVote(entityId, voteType) {
    const key = `review_${entityId}`;
    const existing = voteCache[key];
    const newVote = existing === voteType ? "none" : voteType;

    setReviews((prev) => (Array.isArray(prev) ? prev.map((r) => {
      if (String(r.id) !== String(entityId)) return r;
      let nl = Number(r.likes || 0);
      let nd = Number(r.dislikes || 0);
      if (existing === "like") nl = Math.max(0, nl - 1);
      if (existing === "dislike") nd = Math.max(0, nd - 1);
      if (newVote === "like") nl++;
      if (newVote === "dislike") nd++;
      return { ...r, likes: nl, dislikes: nd };
    }) : prev));

    setVoteCache((prev) => {
      const clone = { ...(prev || {}) };
      if (newVote === "none") delete clone[key];
      else clone[key] = newVote;
      try { localStorage.setItem("vote_cache_v1", JSON.stringify(clone)); } catch {}
      return clone;
    });

    // fire-and-forget API call
    (async () => {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${apiBase}/api/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ entityType: "review", entityId, vote: newVote, userId: currentUser?.id || "anonymous" }),
        });
      } catch (err) {
        console.warn("vote API error", err);
      }
    })();
  }

  // file selection for review form
  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const nextFiles = [...reviewFiles];
    const nextPreviews = [...reviewPreviews];
    for (const file of files) {
      if (nextFiles.length >= MAX_FILES) {
        setFileWarning(`Maximum ${MAX_FILES} attachments allowed`);
        break;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileWarning(`Each file must be <= ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB`);
        continue;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setFileWarning("Only image and video files are allowed");
        continue;
      }
      nextFiles.push(file);
      const url = URL.createObjectURL(file);
      nextPreviews.push({ url, type: file.type.startsWith("video/") ? "video" : "image", name: file.name || `${Date.now()}` });
    }
    setReviewFiles(nextFiles);
    setReviewPreviews(nextPreviews);
    previewsRef.current = nextPreviews;
    e.target.value = "";
  }

  function removeAttachment(index) {
    setReviewFiles((prev) => {
      const arr = Array.isArray(prev) ? prev.slice() : [];
      arr.splice(index, 1);
      return arr;
    });
    setReviewPreviews((prev) => {
      const arr = Array.isArray(prev) ? prev.slice() : [];
      const removed = arr.splice(index, 1);
      if (removed && removed[0] && removed[0].url && removed[0].url.startsWith("blob:")) {
        try { URL.revokeObjectURL(removed[0].url); } catch {}
      }
      previewsRef.current = arr;
      return arr;
    });
  }

  function resetForm() {
    setReviewTitle("");
    setReviewText("");
    setReviewFiles([]);
    reviewPreviews.forEach((p) => { if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
    setReviewPreviews([]);
    previewsRef.current = [];
    setFileWarning("");
    setReviewRating(5);
  }

  // check user purchase status (used for verified badge logic and to restrict who can review)
  async function userHasPurchased(productIdToCheck, user) {
    if (!user || !user.id) return false;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/user/orders/verify?userId=${user.id}&productId=${productIdToCheck}`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json === "boolean") return json;
        if (typeof json?.canReview === "boolean") return json.canReview;
        if (typeof json?.purchased === "boolean") return json.purchased;
        if (Array.isArray(json) && json.length > 0) return true;
        if (json && (json.found || json.count > 0)) return true;
      }
    } catch {}
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/user/orders/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: user.id, productId: productIdToCheck }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json === "boolean") return json;
        if (typeof json?.canReview === "boolean") return json.canReview;
        if (typeof json?.purchased === "boolean") return json.purchased;
        if (Array.isArray(json) && json.length > 0) return true;
        if (json && (json.found || json.count > 0)) return true;
      }
    } catch {}
    try {
      const orders = JSON.parse(localStorage.getItem("orders_v1") || "[]");
      return orders.some((o) => String(o.productId) === String(productIdToCheck) && String(o.userId) === String(user.id));
    } catch {
      return false;
    }
  }

  // submit review (with file upload using useUploader)
  async function handleSubmitReview() {
    const actingUser = currentUser || (() => {
      try { return JSON.parse(localStorage.getItem("current_user") || "null"); } catch { return null; }
    })();

    if (!actingUser) {
      internalToast("Please sign in to submit a review.");
      return;
    }

    if (!reviewText.trim() && !reviewRating && reviewFiles.length === 0) {
      setFileWarning("Please provide a rating, text, or attach a photo/video.");
      return;
    }

    setIsSubmittingReview(true);

    // verify purchase
    const purchased = await userHasPurchased(productId, actingUser);
    if (!purchased) {
      setIsSubmittingReview(false);
      alert("You did not buy this product — only verified buyers can leave reviews.");
      return;
    }

    // optimistic temp review
    const tempId = -Date.now();
    const tempReview = {
      id: tempId,
      userId: actingUser.id,
      userName: actingUser.name || actingUser.email || "You",
      title: reviewTitle || null,
      rating: reviewRating,
      text: reviewText || "",
      likes: 0,
      dislikes: 0,
      created_at: new Date().toISOString(),
      pending: true,
      media: reviewPreviews.map((p) => ({ url: p.url, type: p.type })),
      imageUrl: reviewPreviews[0]?.url || null,
    };

    setReviews((prev) => [tempReview, ...(Array.isArray(prev) ? prev : [])]);
    resetForm();
    setShowReviewForm(false);

    try {
      // upload files if any
      let uploaded = [];
      if (reviewFiles && reviewFiles.length > 0) {
        try {
          setIsUploadingFiles(true);
          uploaded = await upload(reviewFiles);
          if (!Array.isArray(uploaded) || uploaded.length === 0) {
            throw new Error("Upload returned no urls");
          }
        } catch (upErr) {
          console.error("Upload failed:", upErr);
          internalToast("Attachment upload failed. Please try again.");
          setReviews((prev) => (Array.isArray(prev) ? prev.filter((r) => String(r.id) !== String(tempId)) : []));
          setIsSubmittingReview(false);
          setIsUploadingFiles(false);
          return;
        }
      }

      const payload = {
        productId,
        userId: actingUser.id,
        userName: tempReview.userName,
        title: tempReview.title,
        rating: tempReview.rating,
        text: tempReview.text,
        imageUrls: uploaded.map((u) => u.url),
        images: uploaded.map((u) => u.url),
        imageUrl: uploaded.length ? uploaded[0].url : "",
      };

      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errText = "";
        try { errText = await res.text(); } catch {}
        throw new Error(`Review POST failed (${res.status}) ${errText}`);
      }

      const created = await res.json();
      // normalize single
      const createdNormalized = normalizeReviewsPayload(created)[0] || { ...created, id: created.id || created._id };

      // replace temp review with created (if temp existed)
      setReviews((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        const replaced = arr.map((r) => (String(r.id) === String(tempId) ? createdNormalized : r));
        // if not found, put it at top
        if (!replaced.some((r) => String(r.id) === String(createdNormalized.id))) {
          replaced.unshift(createdNormalized);
        }
        return replaced;
      });

      internalToast("Review submitted — thanks!");
    } catch (err) {
      console.error("submitReview err", err);
      internalToast("Review could not be uploaded.");
      // cleanup optimistic
      await fetchReviews();
    } finally {
      setIsSubmittingReview(false);
      setIsUploadingFiles(false);
    }
  }

  // delete review (if allowed)
  async function deleteReview(reviewId) {
    if (!reviewId) return;
    // optimistic remove
    setReviews((prev) => (Array.isArray(prev) ? prev.filter((r) => String(r.id) !== String(reviewId)) : prev));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        internalToast("Could not delete on server; refreshed reviews.");
        await fetchReviews();
      } else {
        internalToast("Review deleted");
      }
    } catch (err) {
      console.error("delete err", err);
      internalToast("Delete failed; try again.");
      await fetchReviews();
    }
  }

  // load more handler
  function loadMore() {
    setVisibleCount((v) => v + PAGE_SIZE);
  }

  // helper: mark current user's reviews as verified if purchased
  const userVerifiedMap = useMemo(() => {
    // map userId -> purchased? (we only mark current user when we know)
    const map = {};
    // we'll treat reviews where userId === currentUser.id as verified true if userHasPurchased returns true (we could fetch per review but that would be heavy)
    // For simplicity we'll rely on userHasPurchased when submitting and mark the submitted review as verified
    return map;
  }, [currentUser]);

  // small subcomponents
  function RatingSummary() {
    return (
      <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800/40 border">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold">{overall.avg || 0}</div>
          <div>
            <StarDisplay value={overall.avg} size={18} />
            <div className="text-sm text-gray-500">{overall.count} review{overall.count !== 1 ? "s" : ""}</div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {[5, 4, 3, 2, 1].map((s, i) => (
            <button
              key={`bar-${s}`}
              type="button"
              onClick={() => setRatingFilter((prev) => (prev === s ? null : s))}
              className={`w-full flex items-center gap-3 text-sm ${
                ratingFilter === s ? "font-semibold text-black dark:text-white" : "text-gray-700 dark:text-gray-300"
              }`}
              aria-pressed={ratingFilter === s}
            >
              <div className="w-8 text-xs">{s}★</div>
              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overall.pct[i]}%` }}
                  transition={{ duration: 0.45 }}
                  className={`h-full rounded ${ratingFilter === s ? "bg-[#3b82f6]" : "bg-[#616467]"}`}
                />
              </div>
              <div className="w-10 text-right text-xs text-gray-500 dark:text-gray-400">{overall.pct[i]}%</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <select aria-label="Sort reviews" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-900">
            <option value="recent">Most recent</option>
            <option value="high">Highest rating</option>
            <option value="low">Lowest rating</option>
          </select>

          <button onClick={() => { setRatingFilter(null); setSortOrder("recent"); }} className="ml-auto text-xs underline text-gray-600 dark:text-gray-300" type="button">
            Reset filters
          </button>
        </div>
      </div>
    );
  }

  function ReviewFormPanel() {
    const [canReviewFlag, setCanReviewFlag] = useState(null);
    useEffect(() => {
      // quick check if user can review (current user)
      (async () => {
        const actingUser = currentUser || (() => {
          try { return JSON.parse(localStorage.getItem("current_user") || "null"); } catch { return null; }
        })();
        if (!actingUser) {
          setCanReviewFlag(false);
          return;
        }
        try {
          const ok = await userHasPurchased(productId, actingUser);
          setCanReviewFlag(Boolean(ok));
        } catch {
          setCanReviewFlag(false);
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, productId]);

    return (
      <div className="w-full lg:sticky lg:top-24">
        <div className="p-3 rounded-md bg-white dark:bg-gray-900 border">
          <div className="text-sm font-semibold mb-2 text-black dark:text-white">Write a review</div>

          <div className="text-sm text-gray-600 mb-3">Only verified buyers can leave reviews.</div>

          <div className="mb-2">
            <div className="text-xs text-gray-600 mb-1">Your rating</div>
            <StarSelector value={reviewRating} onChange={(v) => setReviewRating(v)} size={20} />
          </div>

          <div className="mb-2">
            <input
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm"
            />
          </div>

          <div className="mb-3">
            <textarea rows={4} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Write your review..." className="w-full p-2 border rounded bg-white dark:bg-gray-900 text-sm" />
          </div>

          <div className="mb-3">
            <label className={`${BUTTON_CLASS} cursor-pointer inline-flex items-center`}>
              <Paperclip size={14} /> <span className="ml-2">Attach</span>
              <input type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} className="hidden" />
            </label>
            <div className="text-xs text-gray-500 mt-2">Up to {MAX_FILES} files, max {Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB each</div>
            {fileWarning && <div className="text-xs text-red-600 mt-2">{fileWarning}</div>}
            {reviewPreviews && reviewPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reviewPreviews.map((p, idx) => (
                  <div key={`${p.name || idx}-${idx}`} className="relative border rounded overflow-hidden bg-gray-50 flex items-center justify-center h-28">
                    {p.type === "image" ? (
                      // eslint-disable-next-line
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxItem({ url: p.url, type: "image", name: p.name })} />
                    ) : (
                      <video src={p.url} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxItem({ url: p.url, type: "video", name: p.name })} muted playsInline />
                    )}
                    <button onClick={() => removeAttachment(idx)} type="button" className={`${BUTTON_CLASS} absolute top-2 right-2 bg-white/90 rounded-full p-1`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button disabled={isSubmittingReview || isUploadingFiles || canReviewFlag === false} onClick={handleSubmitReview} className={`${BUTTON_CLASS} flex-1 justify-center`} type="button">
              {isSubmittingReview || isUploadingFiles ? (<><Send size={14} /> Submitting...</>) : (<><Send size={14} /> Submit</>)}
            </button>
            <button onClick={resetForm} className={`${BUTTON_CLASS} justify-center`} type="button"><Trash2 size={14} /> Reset</button>
          </div>

          {uploadError && <div className="text-xs text-red-600 mt-2">Upload error: {String(uploadError)}</div>}
          {canReviewFlag === false && <div className="text-xs text-red-600 mt-2">Only verified buyers can submit reviews.</div>}
        </div>
      </div>
    );
  }

  // responsive layout render
  return (
    <section id="reviews-section" className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 sm:p-6 border border-gray-200/60 dark:border-gray-700/60">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-white">Ratings & Reviews</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Honest feedback from buyers helps everyone</p>
        </div>
        <div className="text-sm text-gray-500">Guidelines apply</div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* left: summary + reviews */}
        <div className="lg:col-span-8">
          {/* rating summary (mobile top) */}
          <div className="mb-4 lg:hidden">
            <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800/40 border">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-black dark:text-white">{overall.avg || 0}</div>
                <div>
                  <StarDisplay value={overall.avg} />
                  <div className="text-sm text-gray-500">{overall.count} review{overall.count !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[5, 4, 3, 2, 1].map((s, i) => (
                  <div key={`m-bar-${s}`} className="flex items-center gap-3 text-sm">
                    <div className="w-8">{s}★</div>
                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${overall.pct[i]}%` }} transition={{ duration: 0.45 }} className="h-full bg-[#616467]" />
                    </div>
                    <div className="w-10 text-right text-xs text-gray-500">{overall.pct[i]}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {ratingFilter ? (
                <div className="text-sm text-gray-700 dark:text-gray-300">Filtering by: <span className="font-semibold ml-1">{ratingFilter}★</span></div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300">Showing all reviews</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-900">
                <option value="recent">Most recent</option>
                <option value="high">Highest rating</option>
                <option value="low">Lowest rating</option>
              </select>
            </div>
          </div>

          {/* reviews list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {visibleReviews.map((r) => {
                const authorName = r.userName || r.user_name || r.name || "Anonymous";
                const initials = (authorName || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
                const createdAt = r.created_at || r.createdAt || new Date().toISOString();
                const isOwn = currentUser && String(currentUser.id) === String(r.userId);
                return (
                  <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }} key={r.id}>
                    <Card className="bg-white dark:bg-gray-900 border dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row items-start gap-4 p-4">
                        <Avatar
                          variant="rounded"
                          alt={authorName}
                          src={r.avatar || undefined}
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: r.avatar ? undefined : stringToHslColor(authorName || initials),
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {!r.avatar ? initials : null}
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Typography variant="subtitle2" className="!text-sm font-semibold text-black dark:text-white">
                                {authorName} {r.verified || isOwn ? <span className="ml-2 inline-block text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">Verified</span> : null}
                              </Typography>
                              <div className="text-xs text-gray-500">{formatRelativeTime(createdAt)}</div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <StarDisplay value={Number(r.rating) || 0} />
                                <div className="text-xs font-medium">{r.rating}★</div>
                              </div>

                              {(currentUser && (String(currentUser.id) === String(r.userId) || currentUser.role === "admin" || currentUser.isAdmin)) && (
                                <button onClick={() => deleteReview(r.id)} className={`${BUTTON_CLASS} ml-2`} type="button" aria-label="Delete review"><Trash2 size={12} /> Delete</button>
                              )}
                            </div>
                          </div>

                          {r.title && <Typography className="text-sm font-medium mt-2 text-black dark:text-white">{r.title}</Typography>}

                          <CardContent className="p-0 pt-3 bg-white dark:bg-gray-900">
                            <Typography className="text-black dark:text-white text-sm">
                              <ReadMore text={r.text} />
                            </Typography>

                            {Array.isArray(r.media) && r.media.length > 0 && (
                              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {r.media.map((m, mi) => (
                                  <div key={`${String(r.id)}-media-${mi}`} className="relative border rounded overflow-hidden bg-gray-50 flex items-center justify-center h-28">
                                    {m.type === "image" ? (
                                      // eslint-disable-next-line
                                      <img src={m.url} alt={m.name || "media"} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxItem({ url: m.url, type: "image", name: m.name })} />
                                    ) : (
                                      <video src={m.url} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxItem({ url: m.url, type: "video", name: m.name })} muted playsInline />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <button onClick={() => toggleVote(r.id, "like")} className={`${BUTTON_CLASS} px-3 py-2`} type="button" aria-pressed={voteCache[`review_${r.id}`] === "like"}>
                                <ThumbsUp size={14} /> <span className="ml-1">{r.likes || 0}</span>
                              </button>
                              <button onClick={() => toggleVote(r.id, "dislike")} className={`${BUTTON_CLASS} px-3 py-2`} type="button" aria-pressed={voteCache[`review_${r.id}`] === "dislike"}>
                                <ThumbsDown size={14} /> <span className="ml-1">{r.dislikes || 0}</span>
                              </button>
                            </div>
                          </CardContent>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* load more */}
          <div className="mt-6 text-center">
            {filtered.length > visibleCount ? (
              <button onClick={loadMore} className={`${BUTTON_CLASS} px-4 py-2`} type="button">Load more</button>
            ) : (
              filtered.length > 0 && <div className="text-sm text-gray-500">End of reviews</div>
            )}
            {filtered.length === 0 && <div className="text-sm text-gray-500">No reviews match your filters.</div>}
          </div>
        </div>

        {/* right: sticky summary + form */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="hidden lg:block">
            <RatingSummary />
          </div>

          <div>
            <ReviewFormPanel />
          </div>

          {/* mobile: small summary at bottom of right column */}
          <div className="block lg:hidden">
            <RatingSummary />
          </div>
        </div>
      </div>

      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

      {/* mobile fixed action bar for submit when form visible */}
      {showReviewForm && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t p-3">
          <div className="max-w-screen-xl mx-auto px-4 flex gap-2">
            <button onClick={handleSubmitReview} disabled={isSubmittingReview || isUploadingFiles} className="flex-1 py-3 rounded-full bg-black text-white flex items-center justify-center gap-2" type="button" aria-label="Submit review (mobile)">
              {isSubmittingReview || isUploadingFiles ? (<><Send size={16} /> Submitting...</>) : (<><Send size={16} /> Submit</>)}
            </button>
            <button onClick={resetForm} className="flex-1 py-3 rounded-full border bg-white text-black flex items-center justify-center gap-2" type="button" aria-label="Reset review (mobile)">
              <Trash2 size={16} /> Reset
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
