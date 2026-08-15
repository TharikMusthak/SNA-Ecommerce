import { Children, useState } from "react";
import { AlertTriangle, ImageOff, Inbox } from "lucide-react";

export default function DataTable({
  headers,
  children,
  label = "Data",
  loading = false,
  error = "",
  emptyMessage = "No records found.",
  minWidth,
}) {
  const rowCount = Children.count(children);
  const stateMessage = loading
    ? "Loading records…"
    : error
      ? error
      : rowCount === 0
        ? emptyMessage
        : null;
  const tableMinWidth = minWidth || Math.max(720, headers.length * 140);
  const tableClass = `data-table data-table--${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div
      className="panel table table-scroll"
      role="region"
      aria-label={`${label} table`}
      aria-busy={loading}
      tabIndex="0"
    >
      <table
        className={tableClass}
        style={{ "--table-min-width": `${tableMinWidth}px` }}
      >
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                className={header === "Actions" ? "table-actions-heading" : undefined}
                key={`${header}-${index}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }, (_, rowIndex) => (
              <tr className="table-skeleton-row" key={`skeleton-${rowIndex}`}>
                {headers.map((header, columnIndex) => (
                  <td key={`${header}-${columnIndex}`}>
                    <span className="skeleton-line" />
                  </td>
                ))}
              </tr>
            ))
          ) : stateMessage ? (
            <tr className={`table-state${error ? " table-state--error" : ""}`}>
              <td
                colSpan={headers.length}
                role={error ? "alert" : "status"}
              >
                <span className="table-state-content">
                  {error ? (
                    <AlertTriangle size={24} aria-hidden="true" />
                  ) : (
                    <Inbox size={24} aria-hidden="true" />
                  )}
                  <b>{error ? "Unable to load records" : stateMessage}</b>
                  {error && <small>{stateMessage}</small>}
                </span>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableImage({ src, alt = "" }) {
  const [failure, setFailure] = useState({ src: null, failed: false });
  const failed = failure.src === src && failure.failed;

  if (!src || failed) {
    return (
      <span
        className="table-image-placeholder"
        role="img"
        aria-label={alt ? `${alt} image unavailable` : "Image unavailable"}
      >
        <ImageOff size={20} aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      className="table-thumbnail"
      src={src}
      alt={alt}
      onError={() => setFailure({ src, failed: true })}
    />
  );
}
