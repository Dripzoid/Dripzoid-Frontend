// src/components/Reviews.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Avatar,
  Card,
  CardContent,
  Typography,
} from "@mui/material";

import {
  ThumbsUp,
  ThumbsDown,
  Send,
  Trash2,
  Paperclip,
} from "lucide-react";

import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa";

import useUploader from "../hooks/useUploader";

const DEFAULT_API_BASE =
  process.env.REACT_APP_API_BASE;

const CLOUDINARY_CLOUD_NAME =
  process.env
    .REACT_APP_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  process.env
    .REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const READ_MORE_LIMIT = 280;

const MAX_FILES = 6;

const MAX_FILE_SIZE_BYTES =
  12 * 1024 * 1024;

const BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-shadow duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20 dark:focus:ring-white/20";

/* =====================================================
   READ MORE
===================================================== */

function ReadMore({ text }) {
  const [open, setOpen] =
    useState(false);

  if (!text) return null;

  if (
    text.length <=
    READ_MORE_LIMIT
  ) {
    return (
      <div className="text-black dark:text-white">
        {text}
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
      <div className="break-words">
        {open
          ? text
          : text.slice(
              0,
              READ_MORE_LIMIT
            ) + "..."}
      </div>

      <button
        onClick={() =>
          setOpen((s) => !s)
        }
        className="mt-2 text-xs underline decoration-black/30 dark:decoration-white/30"
        type="button"
      >
        {open
          ? "Read less"
          : "Read more"}
      </button>
    </div>
  );
}

/* =====================================================
   LIGHTBOX
===================================================== */

function Lightbox({
  item,
  onClose,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        onClose?.();
      }
    }

    if (item) {
      document.addEventListener(
        "keydown",
        onKey
      );

      return () =>
        document.removeEventListener(
          "keydown",
          onKey
        );
    }

    return undefined;
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) =>
          e.stopPropagation()
        }
        className="max-w-[95vw] max-h-[95vh]"
      >
        {item.type === "image" ? (
          <img
            src={item.url}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
          />
        ) : (
          <video
            src={item.url}
            controls
            className="max-w-full max-h-full rounded-xl shadow-lg"
          />
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white text-xl bg-black/40 rounded-full p-2"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

/* =====================================================
   STAR DISPLAY
===================================================== */

function StarDisplay({
  value = 0,
  size = 16,
}) {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (value >= i) {
      stars.push(
        <FaStar
          key={i}
          size={size}
          className="text-yellow-400"
        />
      );
    } else if (
      value >= i - 0.5
    ) {
      stars.push(
        <FaStarHalfAlt
          key={i}
          size={size}
          className="text-yellow-400"
        />
      );
    } else {
      stars.push(
        <FaRegStar
          key={i}
          size={size}
          className="text-yellow-400"
        />
      );
    }
  }

  return (
    <div className="flex items-center gap-1">
      {stars}
    </div>
  );
}

/* =====================================================
   STAR SELECTOR
===================================================== */

function StarSelector({
  value = 5,
  onChange,
  size = 20,
}) {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    const active = value >= i;

    stars.push(
      <button
        key={i}
        type="button"
        onClick={() =>
          onChange?.(i)
        }
        className="p-1 rounded-md hover:scale-110 transition-transform"
      >
        {active ? (
          <FaStar
            size={size}
            className="text-yellow-400"
          />
        ) : (
          <FaRegStar
            size={size}
            className="text-yellow-400"
          />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {stars}
    </div>
  );
}

/* =====================================================
   STRING TO HSL
===================================================== */

function stringToHslColor(
  str = "",
  s = 65,
  l = 45
) {
  let hash = 0;

  for (
    let i = 0;
    i < str.length;
    i++
  ) {
    hash =
      str.charCodeAt(i) +
      ((hash << 5) - hash);

    hash = hash & hash;
  }

  const h =
    Math.abs(hash) % 360;

  return `hsl(${h} ${s}% ${l}%)`;
}

/* =====================================================
   RELATIVE TIME
===================================================== */

function formatRelativeTime(
  isoOrDate
) {
  if (!isoOrDate) return "";

  const date =
    typeof isoOrDate ===
    "string"
      ? new Date(isoOrDate)
      : isoOrDate;

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(isoOrDate);
  }

  const now = new Date();

  const diffSeconds =
    Math.floor(
      (now - date) / 1000
    );

  const diffMinutes =
    Math.floor(
      diffSeconds / 60
    );

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours =
    Math.floor(
      diffMinutes / 60
    );

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays =
    Math.floor(
      diffHours / 24
    );

  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  try {
    return date.toLocaleString(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",
      }
    );
  } catch {
    return date.toLocaleString();
  }
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Reviews({
  productId,
  apiBase =
    DEFAULT_API_BASE,
  currentUser = null,
  showToast = () => {},
}) {
  const [reviews, setReviews] =
    useState([]);

  const [
    reviewRating,
    setReviewRating,
  ] = useState(5);

  const [
    reviewTitle,
    setReviewTitle,
  ] = useState("");

  const [
    reviewText,
    setReviewText,
  ] = useState("");

  const [
    reviewFiles,
    setReviewFiles,
  ] = useState([]);

  const [
    reviewPreviews,
    setReviewPreviews,
  ] = useState([]);

  const [
    isSubmittingReview,
    setIsSubmittingReview,
  ] = useState(false);

  const [
    userCanReview,
    setUserCanReview,
  ] = useState(false);

  const [
    userHasReviewed,
    setUserHasReviewed,
  ] = useState(false);

  const [
    showReviewForm,
    setShowReviewForm,
  ] = useState(false);

  const [
    reviewSubmitted,
    setReviewSubmitted,
  ] = useState(false);

  const [
    voteCache,
    setVoteCache,
  ] = useState({});

  const [
    lightboxItem,
    setLightboxItem,
  ] = useState(null);

  const previewsRef =
    useRef([]);

  const {
    upload,
    isUploading:
      isUploadingFiles,
  } = useUploader(apiBase, {
    cloudName:
      CLOUDINARY_CLOUD_NAME,
    uploadPreset:
      CLOUDINARY_UPLOAD_PRESET,
  });

  /* =====================================================
     TOAST
  ===================================================== */

  function internalToast(msg) {
    showToast(msg);
  }

  /* =====================================================
     FETCH REVIEWS
  ===================================================== */

  async function fetchReviews() {
    try {
      const res = await fetch(
        `${apiBase}/api/reviews/product/${productId}`
      );

      if (!res.ok) return;

      const json =
        await res.json();

      const data =
        json?.data || json;

      setReviews(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "fetchReviews failed:",
        err
      );
    }
  }

  /* =====================================================
     VERIFY PURCHASE
  ===================================================== */

  async function userHasPurchased(
    productIdToCheck,
    user
  ) {
    if (!user || !user.id) {
      return false;
    }

    try {
      const token =
        typeof window !==
        "undefined"
          ? localStorage.getItem(
              "token"
            )
          : null;

      const res = await fetch(
        `${apiBase}/api/user/orders/verify`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            productId:
              productIdToCheck,
          }),
        }
      );

      if (res.ok) {
        const json =
          await res.json();

        const data =
          json?.data ||
          json;

        if (
          typeof data ===
          "boolean"
        ) {
          return data;
        }

        if (
          typeof data?.canReview ===
          "boolean"
        ) {
          return data.canReview;
        }

        if (
          typeof data?.purchased ===
          "boolean"
        ) {
          return data.purchased;
        }
      }
    } catch (err) {
      console.error(
        "Purchase verify failed:",
        err
      );
    }

    return false;
  }

  /* =====================================================
     CHECK ELIGIBILITY
  ===================================================== */

  useEffect(() => {
    async function checkEligibility() {
      const actingUser =
        currentUser ||
        (() => {
          try {
            return JSON.parse(
              localStorage.getItem(
                "current_user"
              ) || "null"
            );
          } catch {
            return null;
          }
        })();

      if (!actingUser) {
        setUserCanReview(false);
        setUserHasReviewed(false);
        return;
      }

      const purchased =
        await userHasPurchased(
          productId,
          actingUser
        );

      setUserCanReview(
        Boolean(purchased)
      );

      const hasReviewed =
        reviews.some(
          (r) =>
            String(
              r.userId
            ) ===
            String(
              actingUser.id
            )
        );

      setUserHasReviewed(
        hasReviewed
      );
    }

    checkEligibility();
  }, [
    productId,
    currentUser,
    reviews,
  ]);

  /* =====================================================
     FETCH REVIEWS
  ===================================================== */

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  /* =====================================================
     FILES
  ===================================================== */

  function onFilesSelected(e) {
    const files = Array.from(
      e.target.files || []
    );

    const nextFiles = [
      ...reviewFiles,
    ];

    const nextPreviews = [
      ...reviewPreviews,
    ];

    for (const file of files) {
      if (
        nextFiles.length >=
        MAX_FILES
      ) {
        break;
      }

      if (
        file.size >
        MAX_FILE_SIZE_BYTES
      ) {
        continue;
      }

      nextFiles.push(file);

      const url =
        URL.createObjectURL(
          file
        );

      nextPreviews.push({
        url,
        type:
          file.type.startsWith(
            "video/"
          )
            ? "video"
            : "image",
        name: file.name,
      });
    }

    setReviewFiles(nextFiles);

    setReviewPreviews(
      nextPreviews
    );

    previewsRef.current =
      nextPreviews;
  }

  /* =====================================================
     SUBMIT REVIEW
  ===================================================== */

  async function handleSubmitReview() {
    const actingUser =
      currentUser ||
      (() => {
        try {
          return JSON.parse(
            localStorage.getItem(
              "current_user"
            ) || "null"
          );
        } catch {
          return null;
        }
      })();

    if (!actingUser) {
      internalToast(
        "Please sign in to review."
      );
      return;
    }

    const purchased =
      await userHasPurchased(
        productId,
        actingUser
      );

    if (!purchased) {
      internalToast(
        "Only verified buyers can review."
      );
      return;
    }

    setIsSubmittingReview(
      true
    );

    try {
      let uploaded = [];

      if (
        reviewFiles.length > 0
      ) {
        uploaded =
          await upload(
            reviewFiles
          );
      }

      const payload = {
        productId,

        title:
          reviewTitle,

        rating:
          reviewRating,

        text: reviewText,

        imageUrls:
          uploaded.map(
            (u) => u.url
          ),

        images:
          uploaded.map(
            (u) => u.url
          ),

        imageUrl:
          uploaded.length > 0
            ? uploaded[0]
                .url
            : "",
      };

      const token =
        localStorage.getItem(
          "token"
        );

      const res = await fetch(
        `${apiBase}/api/reviews`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Review failed"
        );
      }

      setReviewSubmitted(
        true
      );

      setUserHasReviewed(
        true
      );

      setReviewText("");

      setReviewTitle("");

      setReviewFiles([]);

      setReviewPreviews([]);

      fetchReviews();

      internalToast(
        "Review submitted successfully."
      );
    } catch (err) {
      console.error(err);

      internalToast(
        "Review submission failed."
      );
    } finally {
      setIsSubmittingReview(
        false
      );
    }
  }

  /* =====================================================
     DELETE REVIEW
  ===================================================== */

  async function deleteReview(
    reviewId
  ) {
    try {
      const token =
        localStorage.getItem(
          "token"
        );

      const res = await fetch(
        `${apiBase}/api/reviews/${reviewId}`,
        {
          method: "DELETE",

          headers: {
            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      if (!res.ok) {
        throw new Error(
          "Delete failed"
        );
      }

      internalToast(
        "Review deleted."
      );

      fetchReviews();
    } catch (err) {
      console.error(err);

      internalToast(
        "Delete failed."
      );
    }
  }

  /* =====================================================
     TOGGLE VOTE
  ===================================================== */

  async function toggleVote(
    entityId,
    voteType
  ) {
    if (!currentUser) {
      internalToast(
        "Please login to vote."
      );

      return;
    }

    const key = `review_${entityId}`;

    const existing =
      voteCache[key];

    const newVote =
      existing === voteType
        ? "none"
        : voteType;

    try {
      const token =
        localStorage.getItem(
          "token"
        );

      const res = await fetch(
        `${apiBase}/api/votes`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            entityType:
              "review",
            entityId,
            vote: newVote,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Vote failed"
        );
      }

      setVoteCache(
        (prev) => ({
          ...prev,
          [key]: newVote,
        })
      );

      fetchReviews();
    } catch (err) {
      console.error(err);

      internalToast(
        "Vote failed."
      );
    }
  }

  /* =====================================================
     OVERALL
  ===================================================== */

  const overall =
    useMemo(() => {
      const arr =
        Array.isArray(
          reviews
        )
          ? reviews
          : [];

      const total =
        arr.length;

      const avg = total
        ? (
            arr.reduce(
              (s, r) =>
                s +
                Number(
                  r.rating ||
                    0
                ),
              0
            ) / total
          ).toFixed(1)
        : 0;

      return {
        total,
        avg,
      };
    }, [reviews]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <section className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Reviews
          </h2>

          <div className="flex items-center gap-2 mt-2">
            <StarDisplay
              value={Number(
                overall.avg
              )}
            />

            <span>
              {overall.avg} (
              {overall.total})
            </span>
          </div>
        </div>

        {!userHasReviewed &&
          userCanReview && (
            <button
              onClick={() =>
                setShowReviewForm(
                  true
                )
              }
              className={`${BUTTON_CLASS} bg-black text-white`}
            >
              Write Review
            </button>
          )}
      </div>

      {/* FORM */}

      {showReviewForm &&
        !reviewSubmitted && (
          <div className="mt-6 border rounded-xl p-4">
            <div className="mb-4">
              <label className="font-medium">
                Rating
              </label>

              <StarSelector
                value={
                  reviewRating
                }
                onChange={
                  setReviewRating
                }
              />
            </div>

            <div className="mb-4">
              <input
                value={reviewTitle}
                onChange={(e) =>
                  setReviewTitle(
                    e.target.value
                  )
                }
                placeholder="Title"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div className="mb-4">
              <textarea
                value={reviewText}
                onChange={(e) =>
                  setReviewText(
                    e.target.value
                  )
                }
                placeholder="Write review..."
                rows={5}
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div className="mb-4">
              <label
                className={`${BUTTON_CLASS} border cursor-pointer`}
              >
                <Paperclip size={16} />
                Attach Files

                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={
                    onFilesSelected
                  }
                />
              </label>
            </div>

            {reviewPreviews
              .length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {reviewPreviews.map(
                  (
                    p,
                    idx
                  ) => (
                    <div
                      key={idx}
                      className="relative"
                    >
                      {p.type ===
                      "image" ? (
                        <img
                          src={p.url}
                          alt={
                            p.name
                          }
                          className="w-full h-28 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={p.url}
                          className="w-full h-28 object-cover rounded-lg"
                        />
                      )}

                      <button
                        onClick={() => {
                          setReviewPreviews(
                            (
                              prev
                            ) =>
                              prev.filter(
                                (
                                  _,
                                  i
                                ) =>
                                  i !==
                                  idx
                              )
                          );
                        }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            <button
              onClick={
                handleSubmitReview
              }
              disabled={
                isSubmittingReview ||
                isUploadingFiles
              }
              className={`${BUTTON_CLASS} bg-black text-white`}
            >
              <Send size={16} />

              {isSubmittingReview
                ? "Submitting..."
                : "Submit Review"}
            </button>
          </div>
        )}

      {/* REVIEWS */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {reviews.map((r) => {
          const author =
            r.userName ||
            r.username ||
            "Anonymous";

          const avatarColor =
            stringToHslColor(
              author
            );

          return (
            <Card
              key={r.id}
              className="shadow-sm"
            >
              <div className="flex items-start gap-4 p-4">
                <Avatar
                  sx={{
                    bgcolor:
                      avatarColor,
                  }}
                >
                  {author[0]}
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography className="font-semibold">
                        {author}
                      </Typography>

                      <div className="text-xs text-gray-500">
                        {formatRelativeTime(
                          r.createdAt ||
                            r.created_at
                        )}
                      </div>
                    </div>

                    {(currentUser &&
                      (String(
                        currentUser.id
                      ) ===
                        String(
                          r.userId
                        ) ||
                        currentUser.role ===
                          "admin")) && (
                      <button
                        onClick={() =>
                          deleteReview(
                            r.id
                          )
                        }
                        className={`${BUTTON_CLASS} bg-red-50 text-red-700`}
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    )}
                  </div>

                  <div className="mt-2">
                    <StarDisplay
                      value={Number(
                        r.rating
                      )}
                    />
                  </div>

                  {r.title && (
                    <div className="font-medium mt-2">
                      {r.title}
                    </div>
                  )}

                  <div className="mt-2">
                    <ReadMore
                      text={r.text}
                    />
                  </div>

                  {Array.isArray(
                    r.media
                  ) &&
                    r.media
                      .length >
                      0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {r.media.map(
                          (
                            m,
                            i
                          ) => (
                            <div
                              key={
                                i
                              }
                            >
                              {m.type ===
                              "image" ? (
                                <img
                                  src={
                                    m.url
                                  }
                                  alt=""
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer"
                                  onClick={() =>
                                    setLightboxItem(
                                      m
                                    )
                                  }
                                />
                              ) : (
                                <video
                                  src={
                                    m.url
                                  }
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer"
                                  onClick={() =>
                                    setLightboxItem(
                                      m
                                    )
                                  }
                                />
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() =>
                        toggleVote(
                          r.id,
                          "like"
                        )
                      }
                      className={`${BUTTON_CLASS} border`}
                    >
                      <ThumbsUp
                        size={14}
                      />

                      {r.likes ||
                        0}
                    </button>

                    <button
                      onClick={() =>
                        toggleVote(
                          r.id,
                          "dislike"
                        )
                      }
                      className={`${BUTTON_CLASS} border`}
                    >
                      <ThumbsDown
                        size={14}
                      />

                      {r.dislikes ||
                        0}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Lightbox
        item={lightboxItem}
        onClose={() =>
          setLightboxItem(null)
        }
      />
    </section>
  );
}
