import { fail } from "../utils/apiResponse.js";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (result.success) {
      req[source] = result.data;
      return next();
    }

    const errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || source;
      (errors[key] ||= []).push(issue.message);
    }
    return fail(res, 422, "Validation failed", errors);
  };
}
