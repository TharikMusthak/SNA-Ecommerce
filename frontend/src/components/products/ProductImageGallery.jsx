import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Move, ZoomIn, X } from "lucide-react";
import fallbackImage from "@assets/images/product1.png";
import { assetUrl } from "@utils/helpers";

/**
 * Normalizes product images into a clean array of image URLs
 */
export function normalizeProductImages(product, fallback = fallbackImage) {
  if (!product) return [fallback];
  const images = [];

  const addImage = (img) => {
    if (!img) return;
    let url = "";
    if (typeof img === "string") {
      url = img.trim();
    } else if (typeof img === "object") {
      url =
        img.image ||
        img.url ||
        img.image_url ||
        img.image_path ||
        img.path ||
        img.src ||
        img.file_path ||
        "";
    }
    if (url && !images.includes(url)) {
      images.push(url);
    }
  };

  const processKey = (val) => {
    if (!val) return;
    if (Array.isArray(val)) {
      const items = [...val].sort(
        (a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
      );
      items.forEach(addImage);
    } else if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            const items = [...parsed].sort(
              (a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
            );
            items.forEach(addImage);
            return;
          }
        } catch {
          // ignore json parse error
        }
      }
      trimmed.split(",").forEach(addImage);
    }
  };

  // 1. Primary/main product image first
  if (product.main_image) addImage(product.main_image);
  if (product.image) addImage(product.image);
  if (product.image_url) addImage(product.image_url);

  // 2. Parse product.images key (and common field variations)
  processKey(product.images);
  processKey(product.product_images);
  processKey(product.productImages);
  processKey(product.gallery);
  processKey(product.additional_images);
  processKey(product.photos);
  processKey(product.media);

  // 3. Variant images if available
  if (Array.isArray(product.variants)) {
    product.variants.forEach((v) => {
      if (v.image) addImage(v.image);
      if (v.image_url) addImage(v.image_url);
      if (v.images) processKey(v.images);
    });
  }

  if (images.length === 0) {
    return [fallback];
  }

  return images;
}

const ProductImageGallery = ({ product, selectedVariant = null }) => {
  const imageList = normalizeProductImages(product);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Hover Zoom state
  const [isHovered, setIsHovered] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const containerRef = useRef(null);
  const thumbnailsRef = useRef(null);

  // Update active image if selected variant changes and has a matching image
  useEffect(() => {
    if (!selectedVariant) return;
    const variantImg = selectedVariant.image || selectedVariant.image_url;
    if (variantImg) {
      const index = imageList.findIndex(
        (img) => img === variantImg || img.endsWith(variantImg),
      );
      if (index !== -1) {
        setActiveImageIndex(index);
      }
    }
  }, [selectedVariant, imageList]);

  // Keep index within bounds
  useEffect(() => {
    if (activeImageIndex >= imageList.length) {
      setActiveImageIndex(0);
    }
  }, [imageList, activeImageIndex]);

  // Handle Mouse Movement for Amazon-style Zoom
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const currentImageSrc = assetUrl(
    imageList[activeImageIndex] || imageList[0],
    fallbackImage,
  );

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
        setActiveImageIndex((prev) =>
          prev === 0 ? imageList.length - 1 : prev - 1,
        );
      }
      if (e.key === "ArrowRight") {
        setActiveImageIndex((prev) =>
          prev === imageList.length - 1 ? 0 : prev + 1,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, imageList.length]);

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
      {/* Thumbnails Sidebar / Bar */}
      {imageList.length > 1 && (
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
            {imageList.map((img, idx) => {
              const src = assetUrl(img, fallbackImage);
              const isActive = idx === activeImageIndex;
              return (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  onMouseEnter={() => setActiveImageIndex(idx)}
                  className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#f5f7f1] transition-all duration-200 focus-visible:outline-none lg:h-20 lg:w-20 ${
                    isActive
                      ? "border-[#079447] ring-2 ring-[#079447]/30 scale-105 shadow-sm"
                      : "border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300"
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={src}
                    alt={`${product?.name || "Product"} thumbnail ${idx + 1}`}
                    className="h-full w-full object-contain p-1"
                  />
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

      {/* Main Image Stage with Mouse-In Amazon Zoom */}
      <div className="relative w-full flex-1">
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
            src={currentImageSrc}
            alt={product?.name || "Product image"}
            style={{
              transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              transform: isHovered ? "scale(1.5)" : "scale(1)",
            }}
            className="h-full w-full object-contain transition-transform duration-100 ease-out select-none"
          />

          {/* Hover Hint Overlay (Shown when not hovering) */}
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

          {/* Image Navigation Buttons on Main Image stage if multiple images exist */}
          {imageList.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) =>
                    prev === 0 ? imageList.length - 1 : prev - 1,
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
                  setActiveImageIndex((prev) =>
                    prev === imageList.length - 1 ? 0 : prev + 1,
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

          {/* Mouse Lens Lens Indicator when hovered */}
          {isHovered && (
            <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#079447]/90 px-3 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-md animate-fade-in">
              <Move size={12} />
              <span>{Math.round(zoomPos.x)}% x {Math.round(zoomPos.y)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Modal Header & Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            <span className="text-sm font-medium text-white/80">
              {activeImageIndex + 1} / {imageList.length}
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

          {/* Modal Content - High Res Display */}
          <div
            className="relative flex h-full max-h-[85vh] w-full max-w-5xl items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImageSrc}
              alt={product?.name || "Product image enlarged"}
              className="max-h-full max-w-full object-contain transition-all"
            />

            {/* Modal Next / Prev controls */}
            {imageList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === 0 ? imageList.length - 1 : prev - 1,
                    )
                  }
                  className="absolute left-2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === imageList.length - 1 ? 0 : prev + 1,
                    )
                  }
                  className="absolute right-2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                  aria-label="Next image"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          {/* Modal Thumbnail Strip */}
          {imageList.length > 1 && (
            <div
              className="absolute bottom-4 z-50 flex max-w-xl items-center gap-2 overflow-x-auto rounded-2xl bg-black/60 p-2 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {imageList.map((img, idx) => {
                const src = assetUrl(img, fallbackImage);
                const isActive = idx === activeImageIndex;
                return (
                  <button
                    key={`modal-${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      isActive ? "border-[#079447] scale-110" : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
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
