import { useEffect, useId, useState } from "react";
import { assetUrl } from "../api";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export default function VideoUploadField({ existingVideo }) {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const [preview, setPreview] = useState("");
  const [removeExisting, setRemoveExisting] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const source = preview || (!removeExisting && existingVideo ? assetUrl(existingVideo) : "");

  function selectVideo(event) {
    const file = event.target.files?.[0];
    const error = validateVideo(file);
    event.target.setCustomValidity(error);
    setValidationError(error);
    if (error) {
      event.target.value = "";
      setPreview("");
      return;
    }
    setPreview(file ? URL.createObjectURL(file) : "");
    setRemoveExisting(false);
  }

  function clearVideo(event) {
    const input = event.currentTarget.closest(".image-field").querySelector("input[type=file]");
    input.value = "";
    input.setCustomValidity("");
    setValidationError("");
    setPreview("");
    setRemoveExisting(true);
  }

  return (
    <div className="image-field">
      <label htmlFor={inputId}>Product video</label>
      <input type="hidden" name="remove_video" value={removeExisting ? "1" : "0"} />
      <div className="image-upload-box">
        <input id={inputId} name="video" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={selectVideo} aria-describedby={`${helpId}${validationError ? ` ${errorId}` : ""}`} aria-invalid={validationError ? "true" : undefined} />
        <small id={helpId}>MP4, WebM or MOV · Maximum 50 MB</small>
        {validationError && <small id={errorId} className="field-validation-error" role="alert">{validationError}</small>}
      </div>
      {source && (
        <div className="image-preview-single">
          <video src={source} controls preload="metadata" style={{ width: "100%", maxHeight: 320 }} />
          <button type="button" className="clear-images" onClick={clearVideo}>
            {preview ? "Clear selected video" : "Delete existing video"}
          </button>
        </div>
      )}
    </div>
  );
}

function validateVideo(file) {
  if (!file) return "";
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return `${file.name} is not supported. Select an MP4, WebM or MOV video.`;
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `${file.name} is larger than 50 MB. Select a smaller video.`;
  }
  return "";
}
