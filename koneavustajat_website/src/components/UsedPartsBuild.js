import React from "react";
import { useRenderContent } from "../utils/ContentUtils";

const UsedPartsBuild = () => {
	const renderContent = useRenderContent();
  return (
    <div>
      <h2>{renderContent("usedpartsbuild.title", "Build")}</h2>
    </div>
  );
};

export default UsedPartsBuild;
