"use client";

import BrainstormClient from "./brainstorm-client";

export default function BrainstormClientLoader({ isFounder }) {
  return <BrainstormClient isFounder={isFounder} />;
}
