"use client";

import { useState } from "react";
import Banner from "../../../src/components/ui/banner";
import Button from "../../../src/components/ui/button";
import Modal from "../../../src/components/ui/modal";

export default function AuditUiTools() {
  const [modalOpen, setModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  return (
    <div>
      {showToast ? (
        <Banner tone="success" asToast>
          UI preview only: no audit logic changed.
        </Banner>
      ) : null}
      <p>
        <Button onClick={() => setModalOpen(true)}>What is this page?</Button>{" "}
        <Button
          variant="secondary"
          onClick={() => {
            setShowToast(true);
            window.setTimeout(() => setShowToast(false), 1800);
          }}
        >
          Show toast
        </Button>
      </p>
      <Modal open={modalOpen} title="Audit Help" onClose={() => setModalOpen(false)}>
        <p>This page shows local audit entries from prototype actions.</p>
      </Modal>
    </div>
  );
}
