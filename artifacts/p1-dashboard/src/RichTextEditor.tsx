import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
};

export function RichTextEditor({ name, value, defaultValue = "", onChange, required, maxLength = 10000, placeholder, disabled, ariaLabel }: Props) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const currentValue = value ?? localValue;
  const editor = useRef<HTMLDivElement>(null);
  const lastValue = useRef(currentValue);
  useEffect(() => {
    // A contenteditable element has no React children, so seed it explicitly
    // when it is not being edited. Replacing its text while focused resets the
    // selection in some browsers after every keystroke, which makes a long
    // access instruction impossible to enter.
    if (
      editor.current &&
      document.activeElement !== editor.current &&
      editor.current.innerText !== currentValue
    )
      editor.current.textContent = currentValue;
    lastValue.current = currentValue;
  }, [currentValue]);
  const update = () => {
    const text = (editor.current?.innerText || "").slice(0, maxLength);
    lastValue.current = text;
    setLocalValue(text);
    onChange?.(text);
  };
  const command = (value: string) => {
    editor.current?.focus();
    document.execCommand(value);
    update();
  };
  return <div className="rich-text-editor">
    <div className="rich-text-toolbar" role="toolbar" aria-label={`${ariaLabel} formatting`}>
      <button type="button" aria-label="Bold" title="Bold" onMouseDown={(event) => { event.preventDefault(); command("bold"); }} disabled={disabled}><Bold size={15} /></button>
      <button type="button" aria-label="Italic" title="Italic" onMouseDown={(event) => { event.preventDefault(); command("italic"); }} disabled={disabled}><Italic size={15} /></button>
      <button type="button" aria-label="Underline" title="Underline" onMouseDown={(event) => { event.preventDefault(); command("underline"); }} disabled={disabled}><Underline size={15} /></button>
      <span aria-hidden="true" />
      <button type="button" aria-label="Bulleted list" title="Bulleted list" onMouseDown={(event) => { event.preventDefault(); command("insertUnorderedList"); }} disabled={disabled}><List size={16} /></button>
      <button type="button" aria-label="Numbered list" title="Numbered list" onMouseDown={(event) => { event.preventDefault(); command("insertOrderedList"); }} disabled={disabled}><ListOrdered size={16} /></button>
    </div>
    <div ref={editor} className="rich-text-input" role="textbox" aria-multiline="true" aria-label={ariaLabel} aria-required={required} contentEditable={!disabled} suppressContentEditableWarning data-placeholder={placeholder} onInput={update} onPaste={() => requestAnimationFrame(update)} />
    {name && <textarea className="rich-text-value" name={name} value={currentValue} readOnly tabIndex={-1} aria-hidden="true" />}
  </div>;
}
