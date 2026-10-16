import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function CustomSelect({
  children,
  value,
  defaultValue = "",
  onChange,
  name,
  disabled = false,
  required = false,
  className = "",
  "aria-label": ariaLabel,
}) {
  const options = useMemo(
    () => Children.toArray(children).filter(isValidElement).map((option) => ({
      value: String(option.props.value ?? option.props.children ?? ""),
      label: option.props.children,
      disabled: Boolean(option.props.disabled),
    })),
    [children],
  );
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const listId = useId();
  const selectedValue = String(controlled ? value ?? "" : internalValue);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const selected = options[selectedIndex] || options[0];

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (option) => {
    if (option.disabled) return;
    if (!controlled) setInternalValue(option.value);
    onChange?.({ target: { value: option.value, name } });
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      let next = open ? activeIndex : selectedIndex;
      do next = (next + direction + options.length) % options.length;
      while (options[next]?.disabled && next !== activeIndex);
      setActiveIndex(next);
      setOpen(true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(options[activeIndex]);
      else {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`custom-select ${open ? "custom-select--open" : ""} ${className}`.trim()}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        type="button"
        className="custom-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        data-required={required || undefined}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label || ariaLabel || "Select"}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div id={listId} className="custom-select__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              key={`${option.value}-${index}`}
              className={`custom-select__option ${index === activeIndex ? "is-active" : ""}`}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === selectedValue && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

