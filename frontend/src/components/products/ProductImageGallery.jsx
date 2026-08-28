import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Move,
  Play,
  Video,
  X,
  ZoomIn,
} from "lucide-react";
import fallbackImage from "@assets/images/product1.png";
import { assetUrl } from "@utils/helpers";

/**
 * Parses a media item (URL or object) into structured image or video data
 */
export function parseMediaItem(item, fallback = fallbackImage) {
  if (!item) return { type: "image", url: fallback, thumbnail: fallback, original: "" };

  let url = "";
  let type = "image";
  let poster = "";

  if (typeof item === "string") {
    url = item.trim();
  } else if (typeof item === "object") {
    url =
      item.video_url ||
      item.video ||
      item.video_path ||
      item.url ||
      item.image ||
      item.image_url ||
      item.image_path ||
      item.path ||
      item.src ||
      item.file_path ||
      "";
    if (item.type) type = item.type;
    if (item.poster || item.thumbnail || item.thumbnail_url) {
      poster = assetUrl(item.poster || item.thumbnail || item.thumbnail_url);
    }
  }

  if (!url) return { type: "image", url: fallback, thumbnail: fallback, original: "" };

  const rawUrl = url;
  const fullUrl = assetUrl(url);

  // Check for YouTube URLs
  const youtubeMatch = rawUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
  if (youtubeMatch && youtubeMatch[1]) {
    const videoId = youtubeMatch[1];
    return {
      type: "video",
      isEmbed: true,
      provider: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      thumbnail: poster || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: fullUrl,
      original: rawUrl,
    };
  }

  // Check for Vimeo URLs
  const vimeoMatch = rawUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: "video",
      isEmbed: true,
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      thumbnail: poster || fallback,
      url: fullUrl,
      original: rawUrl,
    };
  }

  // Direct video file extensions or type === "video"
  if (
    type === "video" ||
    /\.(mp4|webm|mov|avi|mkv|ogg|m4v)($|\?)/i.test(rawUrl) ||
    rawUrl.startsWith("blob:")
  ) {
    return {
      type: "video",
      isEmbed: false,
      url: fullUrl,
      thumbnail: poster,
      original: rawUrl,
    };
  }

  // Image item
  return {
    type: "image",
    isEmbed: false,
    url: fullUrl,
    thumbnail: poster || fullUrl,
    original: rawUrl,
  };
}

/**
 * Normalizes all product media (images and videos)
 */
export function normalizeProductMedia(product, fallback = fallbackImage) {
  if (!product) return [{ type: "image", url: fallback, thumbnail: fallback }];
  const list = [];
  const addedUrls = new Set();

  const addMedia = (rawItem, defaultType) => {
    if (!rawItem) return;
    const parsed = parseMediaItem(rawItem, fallback);
    if (defaultType && parsed.type === "image" && defaultType === "video") {
      parsed.type = "video";
    }
    if (parsed.url && !addedUrls.has(parsed.url)) {
      addedUrls.add(parsed.url);
      list.push(parsed);
    }
  };

  const processKey = (val, defaultType) => {
    if (!val) return;
    if (Array.isArray(val)) {
      const items = [...val].sort(
        (a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
      );
      items.forEach((i) => addMedia(i, defaultType));
    } else if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((i) => addMedia(i, defaultType));
            return;
          }
        } catch {
          // ignore json parse error
        }
      }
      trimmed.split(",").forEach((i) => addMedia(i, defaultType));
    }
  };

  // 1. Primary product images
  if (product.main_image) addMedia(product.main_image);
  if (product.image) addMedia(product.image);
  if (product.image_url) addMedia(product.image_url);

  // 2. Product video fields
  if (product.video) addMedia(product.video, "video");
  if (product.video_url) addMedia(product.video_url, "video");
  if (product.video_path) addMedia(product.video_path, "video");
  if (product.youtube_url) addMedia(product.youtube_url, "video");
  if (product.vimeo_url) addMedia(product.vimeo_url, "video");
  if (product.demo_video) addMedia(product.demo_video, "video");

  // 3. Array fields
  processKey(product.videos, "video");
  processKey(product.product_videos, "video");
  processKey(product.media);
  processKey(product.images);
  processKey(product.product_images);
  processKey(product.gallery);
  processKey(product.additional_images);
  processKey(product.photos);

  // 4. Variant images & videos
  if (Array.isArray(product.variants)) {
    product.variants.forEach((v) => {
      if (v.image) addMedia(v.image);
      if (v.image_url) addMedia(v.image_url);
      if (v.video || v.video_url) addMedia(v.video || v.video_url, "video");
    });
  }

  if (list.length === 0) {
    return [{ type: "image", url: fallback, thumbnail: fallback }];
  }

  return list;
}

/**
 * Legacy compatibility helper returning array of image URLs
 */
export function normalizeProductImages(product, fallback = fallbackImage) {
  const mediaList = normalizeProductMedia(product, fallback);
  return mediaList.map((m) => m.url);
}

const ProductImageGallery = ({ product, selectedVariant = null }) => {
  const mediaList = normalizeProductMedia(product);
  const [activeIndex, setActiveIndex] = useState(0);

  // Hover Zoom state
  const [isHovered, setIsHovered] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const containerRef = useRef(null);
  const thumbnailsRef = useRef(null);

  // Update active index if selected variant changes
  useEffect(() => {
    if (!selectedVariant) return;
    const variantImg = selectedVariant.image || selectedVariant.image_url;
    if (variantImg) {
      const index = mediaList.findIndex(
        (m) => m.url === variantImg || m.url.endsWith(variantImg),
      );
      if (index !== -1) {
        setActiveIndex(index);
      }
    }
  }, [selectedVariant, mediaList]);

  // Keep index within bounds
  useEffect(() => {
    if (activeIndex >= mediaList.length) {
      setActiveIndex(0);
    }
  }, [mediaList, activeIndex]);

  // Handle Mouse Movement for Amazon-style Zoom
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const currentMedia = mediaList[activeIndex] || mediaList[0];

  // Scroll thumbnails
  const scrollThumbnails = (direction) => {
    if (!thumbnailsRef.current) return;
    const scrollAmount = direction === "left" ? -120 : 120;
    thumbnailsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowLeft") {
        setActiveIndex((prev) =>
          prev === 0 ? mediaList.length - 1 : prev - 1,
        );
      }
      if (e.key === "ArrowRight") {
        setActiveIndex((prev) =>
          prev === mediaList.length - 1 ? 0 : prev + 1,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, mediaList.length]);

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
      {/* Thumbnails Sidebar / Bar */}
      {mediaList.length > 1 && (
        <div className="relative flex w-full shrink-0 items-center justify-center lg:w-20 lg:flex-col lg:justify-start">
          {/* Scroll Prev Button for Mobile/Tablet */}
          <button
            type="button"
            onClick={() => scrollThumbnails("left")}
            className="absolute -left-2 z-10 rounded-full bg-white/90 p-1 shadow-md hover:bg-white lg:hidden"
            aria-label="Previous thumbnails"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Thumbnails Container */}
          <div
            ref={thumbnailsRef}
            className="no-scrollbar flex max-h-[520px] w-full items-center gap-3 overflow-x-auto p-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden"
          >
            {mediaList.map((item, idx) => {
              const isActive = idx === activeIndex;
              const isVideo = item.type === "video";

              return (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#f5f7f1] transition-all duration-200 focus-visible:outline-none lg:h-20 lg:w-20 ${
                    isActive
                      ? "border-[#079447] ring-2 ring-[#079447]/30 scale-105 shadow-sm"
                      : "border-gray-200 opacity-75 hover:opacity-100 hover:border-gray-300"
                  }`}
                  aria-label={`View ${isVideo ? "video" : "image"} ${idx + 1}`}
                >
                  {isVideo ? (
                    <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-full w-full object-cover opacity-80"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover opacity-60"
                          preload="metadata"
                          controlsList="nodownload noplaybackrate"
                          disablePictureInPicture
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#079447] text-white shadow-md group-hover:scale-110 transition-transform">
                          <Play size={13} className="ml-0.5 fill-white" />
                        </span>
                      </div>
                      <span className="absolute bottom-1 right-1 rounded-xs bg-black/80 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-white">
                        Video
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={`${product?.name || "Product"} thumbnail ${idx + 1}`}
                      className="h-full w-full object-contain p-1"
                    />
                  )}

                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#079447]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Next Button for Mobile/Tablet */}
          <button
            type="button"
            onClick={() => scrollThumbnails("right")}
            className="absolute -right-2 z-10 rounded-full bg-white/90 p-1 shadow-md hover:bg-white lg:hidden"
            aria-label="Next thumbnails"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Main Media Display Stage */}
      <div className="relative w-full flex-1">
        {currentMedia.type === "video" ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] bg-black p-0 shadow-inner flex items-center justify-center">
            {currentMedia.isEmbed ? (
              <iframe
                src={currentMedia.embedUrl}
                title={`${product?.name || "Product"} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0 rounded-[2rem]"
              />
            ) : (
              <video
                src={currentMedia.url}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                disableRemotePlayback
                playsInline
                preload="auto"
                poster={currentMedia.thumbnail}
                onContextMenu={(e) => e.preventDefault()}
                className="h-full w-full rounded-[2rem] object-contain"
              />
            )}

            {/* Video Header Badge */}
            <div className="pointer-events-none absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-md">
              <Video size={15} className="text-[#079447]" />
              <span>Product Video</span>
            </div>

            {/* Expand Fullscreen Button for Video */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              aria-label="Expand video fullscreen"
              className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition hover:bg-black hover:text-[#079447] focus:outline-none"
            >
              <Maximize2 size={16} />
            </button>

            {/* Navigation Buttons on Main Stage */}
            {mediaList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev === 0 ? mediaList.length - 1 : prev - 1,
                    )
                  }
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-md transition hover:bg-black hover:text-[#079447]"
                  aria-label="Previous media"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev === mediaList.length - 1 ? 0 : prev + 1,
                    )
                  }
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-md transition hover:bg-black hover:text-[#079447]"
                  aria-label="Next media"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setIsLightboxOpen(true)}
            className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-[2rem] bg-[#f5f7f1] p-6 shadow-inner transition-all duration-300"
          >
            {/* Main Display Image */}
            <img
              src={currentMedia.url}
              alt={product?.name || "Product image"}
              style={{
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transform: isHovered ? "scale(1.5)" : "scale(1)",
              }}
              className="h-full w-full object-contain transition-transform duration-100 ease-out select-none"
            />

            {/* Hover Hint Overlay */}
            <div
              className={`pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-md transition-opacity duration-200 ${
                isHovered ? "opacity-0" : "opacity-100"
              }`}
            >
              <ZoomIn size={14} className="text-[#079447]" />
              <span>Hover to zoom</span>
            </div>

            {/* Fullscreen Expand Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              aria-label="Expand image fullscreen"
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md backdrop-blur-md transition hover:bg-white hover:text-[#079447] focus:outline-none"
            >
              <Maximize2 size={16} />
            </button>

            {/* Image Navigation Buttons */}
            {mediaList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) =>
                      prev === 0 ? mediaList.length - 1 : prev - 1,
                    );
                  }}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow-md backdrop-blur-md transition hover:bg-white hover:text-[#079447] ${
                    isHovered ? "opacity-0" : "opacity-100"
                  }`}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex((prev) =>
                      prev === mediaList.length - 1 ? 0 : prev + 1,
                    );
                  }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow-md backdrop-blur-md transition hover:bg-white hover:text-[#079447] ${
                    isHovered ? "opacity-0" : "opacity-100"
                  }`}
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Lens Indicator */}
            {isHovered && (
              <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#079447]/90 px-3 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-md animate-fade-in">
                <Move size={12} />
                <span>{Math.round(zoomPos.x)}% x {Math.round(zoomPos.y)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Modal Header Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            <span className="text-sm font-medium text-white/80">
              {activeIndex + 1} / {mediaList.length}
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Modal Active Media Content */}
          <div
            className="relative flex h-full max-h-[85vh] w-full max-w-5xl items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {currentMedia.type === "video" ? (
              currentMedia.isEmbed ? (
                <iframe
                  src={currentMedia.embedUrl}
                  title={`${product?.name || "Product"} video player`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full max-w-4xl rounded-2xl shadow-2xl border-0"
                />
              ) : (
                <video
                  src={currentMedia.url}
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  disableRemotePlayback
                  autoPlay
                  playsInline
                  poster={currentMedia.thumbnail}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-h-full max-w-full rounded-2xl bg-black shadow-2xl"
                />
              )
            ) : (
              <img
                src={currentMedia.url}
                alt={product?.name || "Product image enlarged"}
                className="max-h-full max-w-full object-contain transition-all"
              />
            )}

            {/* Modal Navigation Buttons */}
            {mediaList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev === 0 ? mediaList.length - 1 : prev - 1,
                    )
                  }
                  className="absolute left-2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                  aria-label="Previous media"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev === mediaList.length - 1 ? 0 : prev + 1,
                    )
                  }
                  className="absolute right-2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                  aria-label="Next media"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          {/* Modal Thumbnail Strip */}
          {mediaList.length > 1 && (
            <div
              className="absolute bottom-4 z-50 flex max-w-xl items-center gap-2 overflow-x-auto rounded-2xl bg-black/60 p-2 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {mediaList.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isVideo = item.type === "video";

                return (
                  <button
                    key={`modal-${item.url}-${idx}`}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      isActive
                        ? "border-[#079447] scale-110"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  >
                    {isVideo ? (
                      <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="h-full w-full object-cover opacity-75" />
                        ) : (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover opacity-60"
                            preload="metadata"
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        )}
                        <Play size={12} className="absolute text-white fill-white" />
                      </div>
                    ) : (
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
