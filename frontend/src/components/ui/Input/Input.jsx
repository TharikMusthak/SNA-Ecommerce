const Input = ({ type, name, onChange, ...props }) => {
  const handleChange = (e) => {
    if ((type === "email" || name === "email") && typeof e?.target?.value === "string") {
      e.target.value = e.target.value.toLowerCase();
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      type={type}
      name={name}
      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-700 outline-none"
      onChange={handleChange}
      {...props}
    />
  );
};

export default Input;