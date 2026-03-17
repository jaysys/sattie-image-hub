import type { ReactNode } from "react";
import { Icon } from "@blueprintjs/core";

type PanelTitleProps = {
  children: ReactNode;
  icon: React.ComponentProps<typeof Icon>["icon"];
};

export function PanelTitle({ children, icon }: PanelTitleProps) {
  return (
    <h2 className="panel-title">
      <Icon icon={icon} />
      <span>{children}</span>
    </h2>
  );
}
