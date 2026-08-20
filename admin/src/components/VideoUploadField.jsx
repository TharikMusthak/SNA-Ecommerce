import { useEffect, useId, useState } from "react";
import { assetUrl } from "../api";

export default function VideoUploadField({ existingVideo }) {
  const inputId = useId();
  const [preview, setPreview] = useState("");
  const [removeExisting, setRemoveExisting] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const source = preview || (!removeExisting && existingVideo ? assetUrl(existingVideo) : "");

  function selectVideo(event) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : "");
    setRemoveExisting(false);
  }

  function clearVideo(event) {
    const input = event.currentTarget.closest(".image-field").querySelector("input[type=file]");
    input.value = "";
    setPreview("");
    setRemoveExisting(true);
  }

  return (
    <div className="image-field">
      <label htmlFor={inputId}>Product video</label>
      <input type="hidden" name="remove_video" value={removeExisting ? "1" : "0"} />
      <div className="image-upload-box">
        <input id={inputId} name="video" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={selectVideo} />
        <small>MP4, WebM or MOV · Maximum 50 MB</small>
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
