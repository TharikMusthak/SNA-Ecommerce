import { publicAssetUrls } from "./publicAssets.js";

export function ok(res, data = null, message = "Operation completed successfully", status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data: publicAssetUrls(data),
  });
}

export function paginated(res, data, { page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  return res.json({
    success: true,
    data: publicAssetUrls(data),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  });
}

export function fail(res, status, message, errors) {
  const body = { success: false, message };
  if (errors?.code && Object.keys(errors).length === 1) body.code = errors.code;
  else if (errors) body.errors = errors;
  return res.status(status).json(body);
}
