"use client";

import dynamic from "next/dynamic";

const NodesDraftClient = dynamic(() => import("./nodes-draft-client"), {
  ssr: false,
  loading: () => <p>Loading draft nodes...</p>,
});

export default function NodesDraftClientLoader() {
  return <NodesDraftClient />;
}
