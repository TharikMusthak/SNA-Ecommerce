import { useCallback, useEffect, useState } from "react";
import { api, assetUrl } from "../api";

export default function ProductGalleryManager({
  productId,
  onNotice,
  onPrimaryChanged,
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [primaryId, setPrimaryId] = useState(null);

  const loadImages = useCallback(async () => {
    const rows = await api(`/products/${productId}/images`);
    setImages(rows);
  }, [productId]);

  useEffect(() => {
    let active = true;

    loadImages()
      .then(() => {
        if (!active) return;
      })
      .catch((error) => {
        if (active) {
          onNotice(error.message || "Unable to load gallery images", "error");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadImages, onNotice]);

  async function removeImage(imageId) {
    if (
      deletingId ||
      !window.confirm("Delete this gallery image permanently?")
    ) {
      return;
    }

    setDeletingId(imageId);
    try {
      await api(`/products/${productId}/images/${imageId}`, {
        method: "DELETE",
      });
      setImages((current) =>
        current.filter((image) => image.id !== imageId),
      );
      onNotice("Gallery image deleted");
    } catch (error) {
      onNotice(error.message || "Unable to delete gallery image", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function makePrimary(image) {
    if (primaryId || deletingId) return;

    setPrimaryId(image.id);
    try {
      const result = await api(
        `/products/${productId}/images/${image.id}/primary`,
        { method: "PUT" },
      );
      onPrimaryChanged?.(result.main_image);
      await loadImages();
      onNotice("Primary product image updated");
    } catch (error) {
      onNotice(error.message || "Unable to update primary image", "error");
    } finally {
      setPrimaryId(null);
    }
  }

  if (loading) {
    return <p className="gallery-state">Loading existing gallery…</p>;
  }

  if (images.length === 0) {
    return <p className="gallery-state">No existing gallery images.</p>;
  }

  return (
    <section className="existing-gallery" aria-label="Existing gallery images">
      <h3>Existing gallery ({images.length}/8)</h3>
      <div className="existing-gallery-grid">
        {images.map((image, index) => (
          <figure key={image.id}>
            <img
              src={assetUrl(image.image)}
              alt={`Existing product gallery image ${index + 1}`}
            />
            <div className="existing-gallery-actions">
              <button
                type="button"
                className="make-primary"
                disabled={deletingId !== null || primaryId !== null}
                onClick={() => makePrimary(image)}
              >
                {primaryId === image.id ? "Updating…" : "Make primary"}
              </button>
              <button
                type="button"
                disabled={deletingId !== null || primaryId !== null}
                onClick={() => removeImage(image.id)}
                aria-label={`Delete gallery image ${index + 1}`}
              >
                {deletingId === image.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
