"use client";

import dynamic from "next/dynamic";

const ProposalsClient = dynamic(() => import("./proposals-client"), {
  ssr: false,
  loading: () => <p>Loading proposals...</p>,
});

export default function ProposalsClientLoader() {
  return <ProposalsClient />;
}
