export function parsePagination(query, allowedSorts, defaultSort = "id") {
  const page = integer(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = integer(query.limit, 20, 1, 100);
  const search = String(query.search || "").trim().slice(0, 120);
  const sort = allowedSorts.includes(query.sort) ? query.sort : defaultSort;
  const order = String(query.order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  return { page, limit, search, sort, order, offset: (page - 1) * limit };
}

function integer(value, fallback, min, max) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : fallback;
}
