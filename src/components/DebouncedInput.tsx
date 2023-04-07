import {
  ChangeEventHandler,
  HTMLProps,
  useEffect,
  useRef,
  useState,
} from "react";

const DebouncedInput = ({
  customValue,
  customOnChange,
  ...props
}: {
  customValue: string;
  customOnChange: (value: string) => void;
} & HTMLProps<HTMLInputElement>) => {
  const [inputValue, setInputValue] = useState(customValue);
  let timeout = useRef<null | NodeJS.Timeout>(null);

  const actualOnChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (timeout.current) clearTimeout(timeout.current);
    setInputValue(e.target.value);

    timeout.current = setTimeout(() => {
      customOnChange(e.target.value);
    }, 800);
  };

  useEffect(() => setInputValue(customValue), [customValue]);

  return <input {...props} onChange={actualOnChange} value={inputValue} />;
};

export default DebouncedInput;
