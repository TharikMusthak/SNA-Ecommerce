import { useEffect, useRef, useState } from "react";
import {
  ArrowDown10,
  ArrowUp01,
  ArrowUpDown,
  Check,
  ChevronDown,
  SortAsc,
  Sparkles,
} from "lucide-react";

const SORT_OPTIONS = [
  {
    value: "newest",
    label: "Newest Arrivals",
    description: "Show latest products first",
    icon: Sparkles,
  },
  {
    value: "name",
    label: "Name (A - Z)",
    description: "Sort alphabetically",
    icon: SortAsc,
  },
  {
    value: "price_asc",
    label: "Price: Low to High",
    description: "Cheapest options first",
    icon: ArrowUp01,
  },
  {
    value: "price_desc",
    label: "Price: High to Low",
    description: "Premium options first",
    icon: ArrowDown10,
  },
];

const ProductSortDropdown = ({ value = "newest", onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeOption =
    SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sort products"
        className={`
          inline-flex items-center justify-between gap-3
          rounded-2xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-800
          shadow-xs backdrop-blur-md transition-all duration-200
          hover:border-[#079447]/60 hover:bg-gray-50/80 hover:shadow-md
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]
          ${isOpen ? "border-[#079447] ring-4 ring-[#079447]/10 shadow-md" : "border-gray-200"}
        `}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#079447]/10 text-[#079447]">
            <ArrowUpDown size={15} />
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Sort By
            </span>
            <span className="font-semibold text-gray-800 leading-tight">
              {activeOption.label}
            </span>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-[#079447]" : ""
          }`}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Sort options"
          className="
            absolute right-0 z-50 mt-2.5 w-64 origin-top-right overflow-hidden
            rounded-2xl border border-gray-100 bg-white/95 p-1.5 shadow-2xl shadow-emerald-950/10
            backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-95
          "
        >
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Sort Catalogue
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#079447]/10 text-[#079447]">
              {SORT_OPTIONS.length} options
            </span>
          </div>

          <div className="mt-1 space-y-1">
            {SORT_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              const Icon = option.icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm
                    transition-all duration-150
                    ${
                      isSelected
                        ? "bg-[#079447]/10 text-[#079447] font-semibold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`
                        flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors
                        ${
                          isSelected
                            ? "bg-[#079447] text-white"
                            : "bg-gray-100 text-gray-500 group-hover:bg-[#079447]/15 group-hover:text-[#079447]"
                        }
                      `}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="flex flex-col">
                      <span className="leading-snug">{option.label}</span>
                      <span
                        className={`text-[11px] font-normal ${
                          isSelected ? "text-[#079447]/80" : "text-gray-400"
                        }`}
                      >
                        {option.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#079447] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSortDropdown;
