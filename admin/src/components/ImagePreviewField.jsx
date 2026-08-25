import { useEffect, useId, useState } from "react";
import { assetUrl } from "../api";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 8;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function ImagePreviewField({
  name,
  label,
  existingImage,
  multiple = false,
  required = false,
  removeFieldName,
  allowExistingRemoval = true,
  onChange,
}) {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const [selectedPreviews, setSelectedPreviews] = useState([]);
  const [removedImage, setRemovedImage] = useState(null);
  const [validationError, setValidationError] = useState("");
  const removeExisting = Boolean(existingImage && removedImage === existingImage);

  useEffect(() => {
    return () => {
      selectedPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedPreviews]);

  const existingPreview =
    existingImage && !removeExisting ? assetUrl(existingImage) : null;
  const previews =
    selectedPreviews.length > 0
      ? selectedPreviews
      : existingPreview
        ? [existingPreview]
        : [];

  function handleChange(event) {
    const files = Array.from(event.target.files || []);

    const error = validateImages(files, multiple);
    event.target.setCustomValidity(error);
    setValidationError(error);
    if (error) {
      event.target.value = "";
      setSelectedPreviews([]);
      onChange?.([]);
      return;
    }

    setSelectedPreviews(files.map((file) => URL.createObjectURL(file)));
    setRemovedImage(null);
    onChange?.(files);
  }

  function clearFiles(event) {
    event.preventDefault();
    const input = event.currentTarget
      .closest(".image-field")
      .querySelector("input[type=file]");
    input.value = "";
    input.setCustomValidity("");
    setValidationError("");
    setSelectedPreviews([]);
    onChange?.([]);

    if (
      selectedPreviews.length === 0 &&
      existingImage &&
      allowExistingRemoval
    ) {
      setRemovedImage(existingImage);
    }
  }

  return (
    <div className="image-field">
      <label htmlFor={inputId}>{label}</label>
      {removeFieldName && (
        <input
          type="hidden"
          name={removeFieldName}
          value={removeExisting ? "1" : "0"}
        />
      )}
      <div className="image-upload-box">
        <input
          id={inputId}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          required={required && previews.length === 0}
          onChange={handleChange}
          aria-describedby={`${helpId}${validationError ? ` ${errorId}` : ""}`}
          aria-invalid={validationError ? "true" : undefined}
        />
        <small id={helpId}>
          JPG, PNG or WebP · Maximum 5 MB · Banner images are optimized automatically
          {multiple ? " · Up to 8 images" : ""}
        </small>
        {validationError && (
          <small id={errorId} className="field-validation-error" role="alert">
            {validationError}
          </small>
        )}
      </div>

      {previews.length > 0 && (
        <div className={multiple ? "image-preview-grid" : "image-preview-single"}>
          {previews.map((preview, index) => (
            <figure key={preview}>
              <img src={preview} alt={`${label} preview ${index + 1}`} />
              <figcaption>Preview {index + 1}</figcaption>
            </figure>
          ))}
          {(selectedPreviews.length > 0 ||
            (existingImage && allowExistingRemoval)) && (
            <button className="clear-images" type="button" onClick={clearFiles}>
              {selectedPreviews.length > 0
                ? `Clear selected image${multiple ? "s" : ""}`
                : "Remove existing image"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function validateImages(files, multiple) {
  if (multiple && files.length > MAX_IMAGE_COUNT) {
    return `Select no more than ${MAX_IMAGE_COUNT} images.`;
  }
  const invalidType = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
  if (invalidType) {
    return `${invalidType.name} is not supported. Select a JPG, PNG or WebP image.`;
  }
  const oversized = files.find((file) => file.size > MAX_IMAGE_BYTES);
  if (oversized) {
    return `${oversized.name} is larger than 5 MB. Select a smaller image.`;
  }
  return "";
}
