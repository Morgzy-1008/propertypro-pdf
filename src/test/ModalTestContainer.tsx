import React from "react";
import ReactDOM from "react-dom/client";
import { ModifiedPlanReviewModal } from "@/components/quoting/ModifiedPlanReviewModal";

let currentRoot: any = null;

export function renderTestModal(analysis: any, containerId = "test-modal-mount") {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
  }
  if (currentRoot) {
    currentRoot.unmount();
  }
  currentRoot = ReactDOM.createRoot(container);
  currentRoot.render(
    React.createElement(ModifiedPlanReviewModal, {
      isOpen: true,
      onClose: () => {},
      analysis,
      onApply: () => {},
      isLight: false,
    })
  );
  return currentRoot;
}
