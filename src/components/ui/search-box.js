"use client";

export default function SearchBox({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        className="vo-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
