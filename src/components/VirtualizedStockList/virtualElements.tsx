import React, { forwardRef, useContext } from "react";

export interface VirtualElementProps extends React.HTMLAttributes<HTMLDivElement> {
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const VirtualScrollContext = React.createContext<{
  header: React.ReactNode;
  headerRef: (node: HTMLDivElement | null) => void;
}>({
  header: null,
  headerRef: () => {},
});

export const VirtualOuterElement = forwardRef<HTMLDivElement, VirtualElementProps>(
  ({ children, style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        overflowY: "auto",
        overflowX: "hidden",
      }}
      {...rest}
    >
      {children}
    </div>
  ),
);
VirtualOuterElement.displayName = "VirtualOuterElement";

export const VirtualInnerElement = forwardRef<HTMLDivElement, VirtualElementProps>(
  ({ children, style, ...rest }, ref) => {
    const { header, headerRef } = useContext(VirtualScrollContext);
    return (
      <div ref={ref} style={{ ...style, position: "relative" }} {...rest}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 10 }}>
          <div ref={headerRef}>{header}</div>
        </div>
        {children}
      </div>
    );
  },
);
VirtualInnerElement.displayName = "VirtualInnerElement";
