"use client";

export default function SearchBox({ id, label, value, onChange }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <br />
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </>
  );
}
