import { type ReactNode } from "react";

const StrippedModal = ({
  onRequestClose,
  children,
  blocking,
}: {
  onRequestClose: () => void;
  children: ReactNode;
  blocking: boolean;
}) => {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onRequestClose();
      }}
      className={`fixed inset-0 z-10 ${blocking ? "" : "pointer-events-none"}`}
    >
      {children}
    </div>
  );
};

export default StrippedModal;
