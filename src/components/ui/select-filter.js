"use client";

export default function SelectFilter({ id, label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <br />
      <select
        id={id}
        className="vo-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
