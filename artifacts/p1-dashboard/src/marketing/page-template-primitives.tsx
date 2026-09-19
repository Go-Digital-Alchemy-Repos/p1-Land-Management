import React, { useEffect, useRef } from "react";
import type { PageTemplatePrimitives } from "../../../../platform/p1-core/client/src/components/shared/page-template-primitives";
import { formPrimitives } from "./forms-primitives";
export const pageTemplatePrimitives: PageTemplatePrimitives = {
  ...formPrimitives,
  Dialog: ({ open, onOpenChange, children }) => {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
      if (open && !ref.current?.open) ref.current?.showModal();
      if (!open && ref.current?.open) ref.current.close();
    }, [open]);
    return (
      <dialog
        ref={ref}
        className="cms-page-template-dialog cms-page-presentation"
        onCancel={(event) => {
          event.preventDefault();
          onOpenChange(false);
        }}
        onClose={() => onOpenChange(false)}
      >
        {open && children}
      </dialog>
    );
  },
  DialogContent: (props) => <div {...props} />,
  DialogHeader: ({ className = "", ...props }) => (
    <div {...props} className={`cms-template-header ${className}`} />
  ),
  DialogTitle: (props) => <h2 {...props} />,
  DialogFooter: ({ className = "", ...props }) => (
    <div {...props} className={`cms-template-footer ${className}`} />
  ),
  Separator: () => <hr />,
};
