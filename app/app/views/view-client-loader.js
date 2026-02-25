"use client";

import dynamic from "next/dynamic";

const ViewsClient = dynamic(() => import("./views-client"), {
  ssr: false,
  loading: () => <p>Loading view...</p>,
});

export default function ViewClientLoader({ mode, viewScope }) {
  return <ViewsClient mode={mode} viewScope={viewScope} />;
}
