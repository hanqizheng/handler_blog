import { useCallback, useEffect, useRef, useState } from "react";

export const useControllableValue = <T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (updater: T | ((prev: T) => T)) => void] => {
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultValue);
  const currentValue = isControlled
    ? (controlledValue as T)
    : uncontrolledValue;
  const valueRef = useRef(currentValue);

  useEffect(() => {
    valueRef.current = currentValue;
  }, [currentValue]);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const nextValue =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(valueRef.current)
          : updater;

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      valueRef.current = nextValue;
      onChange?.(nextValue);
    },
    [isControlled, onChange],
  );

  return [currentValue, setValue];
};
