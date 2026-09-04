import { RotateCcw, Search } from "lucide-react";
import CustomSelect from "./CustomSelect";

export default function ModuleToolbar({
  search,
  onSearchChange,
  searchLabel,
  status,
  statuses = [],
  onStatusChange,
  onReset,
  children,
}) {
  const hasFilters = Boolean(search || status);
  return (
    <div className="commerce-toolbar module-toolbar">
      <label className="search-field">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{searchLabel}</span>
        <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchLabel} />
      </label>
      {onStatusChange && (
        <CustomSelect aria-label="Status filter" value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </CustomSelect>
      )}
      {children}
      <button className="secondary-button" type="button" disabled={!hasFilters && !children} onClick={onReset}>
        <RotateCcw size={15} aria-hidden="true" /> Reset
      </button>
    </div>
  );
}
