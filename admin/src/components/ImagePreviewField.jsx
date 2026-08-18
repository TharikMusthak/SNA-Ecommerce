import { useEffect, useId, useState } from "react";
import { assetUrl } from "../api";

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
  const [selectedPreviews, setSelectedPreviews] = useState([]);
  const [removedImage, setRemovedImage] = useState(null);
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
           accept="image/jpeg,image/png,image/webp,video/*"
          multiple={multiple}
          required={required && previews.length === 0}
          onChange={handleChange}
          aria-describedby={helpId}
        />
        <small id={helpId}>
          JPG, PNG, WebP or MP4 · Maximum 5 MB
          {multiple ? " · Up to 8 images" : ""}
        </small>
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
