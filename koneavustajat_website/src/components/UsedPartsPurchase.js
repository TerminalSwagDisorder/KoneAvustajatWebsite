import React from "react";
import { useRenderContent } from "../utils/ContentUtils";

const UsedPartsPurchase = () => {
	const renderContent = useRenderContent();
  return (
    <div>
      <h2>{renderContent("usedpartspurchase.title", "Purchase")}</h2>
    </div>
  );
};

export default UsedPartsPurchase;
