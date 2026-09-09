export default function DateFilterInput({ label, value = "", onChange }) {
  return (
    <input
      aria-label={label}
      type={value ? "date" : "text"}
      placeholder={label}
      value={value}
      onFocus={(event) => { event.currentTarget.type = "date"; }}
      onBlur={(event) => {
        if (!event.currentTarget.value) event.currentTarget.type = "text";
      }}
      onChange={onChange}
    />
  );
}
