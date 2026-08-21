import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useState,
} from "react";
import { Keyboard, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn, isMacRuntime } from "@/lib/utils";

export interface ShortcutCaptureLabels {
  mouseBack: string;
  mouseForward: string;
  mouseMiddle: string;
}

interface ShortcutCaptureInputProps {
  allowMouse?: boolean;
  clearLabel: string;
  id: string;
  labels?: ShortcutCaptureLabels;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onRejected: (messageKey: string) => void;
  placeholder: string;
  value: string;
}

export function ShortcutCaptureInput({
  allowMouse = true,
  clearLabel,
  id,
  labels,
  onBlur,
  onChange,
  onFocus,
  onRejected,
  placeholder,
  value,
}: ShortcutCaptureInputProps) {
  const [pendingModifiers, setPendingModifiers] = useState<string[]>([]);
  const displayValue = value
    ? formatShortcutForDisplay(value, labels)
    : formatPendingShortcut(pendingModifiers);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      onChange("");
      return;
    }

    const nextPendingModifiers = keyboardEventToModifiers(event);
    if (isModifierKey(event.key)) {
      setPendingModifiers(nextPendingModifiers);
      return;
    }

    const shortcut = keyboardEventToShortcut(event);
    if (shortcut) {
      setPendingModifiers([]);
      onChange(shortcut);
      return;
    }

    setPendingModifiers([]);
    onRejected("errors.shortcutReserved");
  }

  function handleKeyUp(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!isModifierKey(event.key)) {
      return;
    }

    const nextModifiers = keyboardEventToModifiers(event).filter(
      (modifier) => modifier !== normalizeModifierKey(event.key),
    );
    setPendingModifiers(nextModifiers);
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLInputElement>) {
    if (!allowMouse) {
      return;
    }

    const shortcut = mouseButtonToShortcut(event.button);
    if (!shortcut) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setPendingModifiers([]);
    onChange(shortcut);
  }

  return (
    <div className="relative">
      <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={displayValue}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseDown={handleMouseDown}
        onFocus={onFocus}
        onBlur={() => {
          setPendingModifiers([]);
          onBlur?.();
        }}
        onPaste={(event) => event.preventDefault()}
        placeholder={placeholder}
        readOnly
        className={cn("pl-9", value ? "pr-10" : "pr-3")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          aria-label={clearLabel}
          title={clearLabel}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function keyboardEventToShortcut(event: ReactKeyboardEvent<HTMLInputElement>) {
  if (event.metaKey && !isMacRuntime()) {
    return "";
  }

  const key = normalizeKeyboardKey(event.key, event.code);
  if (!key || isReservedShortcutKey(key)) {
    return "";
  }

  return [...keyboardEventToModifiers(event), key].join("+");
}

function keyboardEventToModifiers(event: ReactKeyboardEvent<HTMLInputElement>) {
  const modifiers = [];

  if (event.metaKey && isMacRuntime()) {
    modifiers.push("Command");
  }

  if (event.ctrlKey) {
    modifiers.push("Control");
  }

  if (event.altKey) {
    modifiers.push("Alt");
  }

  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  return modifiers;
}

function isModifierKey(key: string) {
  return (
    key === "Control" ||
    key === "Alt" ||
    key === "Shift" ||
    key === "Meta" ||
    key === "Command"
  );
}

function normalizeModifierKey(key: string) {
  if (key === "Meta" || key === "Command") {
    return isMacRuntime() ? "Command" : "";
  }

  return key === "Control" || key === "Alt" || key === "Shift" ? key : "";
}

function normalizeKeyboardKey(key: string, code: string) {
  if (key === "Control" || key === "Alt" || key === "Shift" || key === "Meta") {
    return "";
  }

  const functionKey = code.match(/^F([1-9]|1\d|2[0-4])$/)?.[0];
  if (functionKey) {
    return functionKey;
  }

  if (/^Numpad\d$/.test(code)) {
    return code.replace("Numpad", "");
  }

  if (/^[a-z]$/i.test(key)) {
    return key.toUpperCase();
  }

  if (/^\d$/.test(key)) {
    return key;
  }

  const namedKeys: Record<string, string> = {
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Backspace: "Backspace",
    Delete: "Delete",
    End: "End",
    Enter: "Enter",
    Escape: "Escape",
    Home: "Home",
    Insert: "Insert",
    PageDown: "PageDown",
    PageUp: "PageUp",
    CapsLock: "Capslock",
    NumLock: "Numlock",
    ScrollLock: "Scrolllock",
    PrintScreen: "PrintScreen",
    " ": "Space",
  };

  if (namedKeys[key]) {
    return namedKeys[key];
  }

  const codeKeys: Record<string, string> = {
    Backquote: "Backquote",
    Backslash: "Backslash",
    BracketLeft: "BracketLeft",
    BracketRight: "BracketRight",
    Comma: "Comma",
    Equal: "Equal",
    Minus: "Minus",
    Period: "Period",
    Quote: "Quote",
    Semicolon: "Semicolon",
    Slash: "Slash",
  };

  return codeKeys[code] ?? "";
}

function isReservedShortcutKey(key: string) {
  return (
    key === "Escape" ||
    key === "Enter" ||
    key === "Tab" ||
    key === "Space" ||
    key === "Backspace" ||
    key === "Delete"
  );
}

function mouseButtonToShortcut(button: number) {
  if (button === 1) {
    return "MouseMiddle";
  }

  if (button === 3) {
    return "MouseBack";
  }

  if (button === 4) {
    return "MouseForward";
  }

  return "";
}

function formatPendingShortcut(modifiers: string[]) {
  if (modifiers.length === 0) {
    return "";
  }

  return `${formatShortcutKeys(modifiers)} +`;
}

function formatShortcutForDisplay(value: string, labels?: ShortcutCaptureLabels) {
  const mouseLabels: Record<string, string> = {
    MouseBack: labels?.mouseBack ?? "Mouse back",
    MouseForward: labels?.mouseForward ?? "Mouse forward",
    MouseMiddle: labels?.mouseMiddle ?? "Middle click",
  };

  return mouseLabels[value] ?? formatShortcutKeys(value.split("+"));
}

function formatShortcutKeys(keys: string[]) {
  const mac = isMacRuntime();

  return keys
    .map((key) => {
      if (key === "Command") {
        return "Cmd";
      }

      if (key === "Control") {
        return "Ctrl";
      }

      if (key === "Alt") {
        return mac ? "Option" : "Alt";
      }

      return key;
    })
    .filter(Boolean)
    .join("+");
}
