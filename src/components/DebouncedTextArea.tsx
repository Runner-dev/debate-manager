import {
  type ChangeEventHandler,
  type HTMLProps,
  useEffect,
  useRef,
  useState,
} from "react";

const DebouncedTextArea = ({
  customValue,
  customOnChange,
  ...props
}: {
  customValue: string;
  customOnChange: (value: string) => void;
} & HTMLProps<HTMLTextAreaElement>) => {
  const [inputValue, setInputValue] = useState(customValue);
  const timeout = useRef<null | NodeJS.Timeout>(null);

  const actualOnChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    if (timeout.current) clearTimeout(timeout.current);
    setInputValue(e.target.value);

    timeout.current = setTimeout(() => {
      customOnChange(e.target.value);
    }, 800);
  };

  useEffect(() => setInputValue(customValue), [customValue]);

  return <textarea {...props} onChange={actualOnChange} value={inputValue} />;
};

export default DebouncedTextArea;
