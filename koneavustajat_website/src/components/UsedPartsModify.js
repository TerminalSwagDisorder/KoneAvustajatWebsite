import React from "react";
import { useRenderContent } from "../utils/ContentUtils";

const UsedPartsModify = () => {
	const renderContent = useRenderContent();
  return (
    <div>
      <h2>{renderContent("usedpartsmodify.title", "Modify Used Parts")}</h2>
    </div>
  );
};

export default UsedPartsModify;
