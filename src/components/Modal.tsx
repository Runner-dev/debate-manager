import { ReactNode } from "react";
import Close from "~/icons/Close";

const Modal = ({
  visible,
  onRequestClose,
  children,
  className = "",
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  className?: string;
}) => {
  return visible ? (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onRequestClose();
      }}
      className="fixed inset-0 z-10 flex items-center justify-center bg-gray-800/50"
    >
      <div className={`flex flex-col rounded-md bg-gray-200 p-8 ${className}`}>
        <button
          className="-mt-6 -mr-6 self-end"
          onClick={() => {
            onRequestClose();
          }}
        >
          <Close className="h-8 w-8 self-end text-black" />
        </button>
        {children}
      </div>
    </div>
  ) : null;
};

export default Modal;
