"use client";

export default function SelectFilter({ id, label, value, onChange, options }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <br />
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
