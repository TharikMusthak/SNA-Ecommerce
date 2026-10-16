const DEFAULT_MAX_BYTES = 1.8 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2200;

export async function compressFormDataImages(
  formData,
  fieldNames,
  { maxBytes = DEFAULT_MAX_BYTES, maxDimension = DEFAULT_MAX_DIMENSION } = {},
) {
  const compressedFields = [];

  for (const fieldName of fieldNames) {
    const file = formData.get(fieldName);
    if (!(file instanceof File) || file.size === 0) continue;

    const compressed = await compressImage(file, { maxBytes, maxDimension });
    formData.set(fieldName, compressed);
    if (compressed.size < file.size) compressedFields.push(fieldName);
  }

  return compressedFields;
}

async function compressImage(file, { maxBytes, maxDimension }) {
  if (!file.type.startsWith("image/")) return file;

  const image = await loadImage(file);
  let scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  let quality = 0.86;
  let result = file;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d", { alpha: true }).drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", quality);
    result = new File([blob], webpName(file.name), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
    if (result.size <= maxBytes) break;

    quality = Math.max(0.55, quality - 0.08);
    if (quality === 0.55) scale *= 0.82;
  }

  image.close?.();
  if (result.size > maxBytes) {
    throw new Error(
      `${file.name} could not be compressed below ${formatMegabytes(maxBytes)} MB. Select a smaller image.`,
    );
  }
  return result.size < file.size ? result : file;
}

async function loadImage(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Image compression failed")),
      type,
      quality,
    );
  });
}

function webpName(name) {
  return `${String(name || "banner").replace(/\.[^.]+$/, "")}.webp`;
}

function formatMegabytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}
