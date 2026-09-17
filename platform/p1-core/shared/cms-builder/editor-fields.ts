import type { PropDef } from "./block-registry.shared";

export function getActionControllerKey(key: string) {
  if (key === "link" || key === "formSlug" || key === "modalTitle" || key === "modalDescription") {
    return "action";
  }

  if (key.endsWith("FormSlug")) return `${key.slice(0, -"FormSlug".length)}Action`;
  if (key.endsWith("ModalTitle")) return `${key.slice(0, -"ModalTitle".length)}Action`;
  if (key.endsWith("ModalDescription")) return `${key.slice(0, -"ModalDescription".length)}Action`;
  if (key.endsWith("OpenInNewTab")) return `${key.slice(0, -"OpenInNewTab".length)}Action`;
  if (key.endsWith("Link")) return `${key.slice(0, -"Link".length)}Action`;

  return null;
}

function getLinkKeyForActionController(actionControllerKey: string) {
  if (actionControllerKey === "action") return "link";
  if (actionControllerKey.endsWith("Action")) {
    return `${actionControllerKey.slice(0, -"Action".length)}Link`;
  }
  return null;
}

function isInternalHref(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed === "";
}

export function normalizeButtonActionValue(key: string, values: Record<string, unknown>) {
  const actionControllerKey = key.endsWith("Action") ? key : getActionControllerKey(key);
  if (!actionControllerKey) return "custom-link";

  const rawAction = String(values[actionControllerKey] ?? "internal-link");
  if (rawAction === "internal-link" || rawAction === "custom-link" || rawAction === "form-modal") {
    return rawAction;
  }

  if (rawAction === "url") {
    const linkKey = getLinkKeyForActionController(actionControllerKey);
    const linkValue = linkKey ? String(values[linkKey] ?? "") : "";
    return isInternalHref(linkValue) ? "internal-link" : "custom-link";
  }

  return "custom-link";
}

export function isButtonLinkFieldKey(key: string) {
  return key === "link" || key.endsWith("Link");
}

export function getDynamicPropLabel(
  propDef: Pick<PropDef, "key" | "label">,
  values: Record<string, unknown>,
) {
  if (isButtonLinkFieldKey(propDef.key)) {
    const actionValue = normalizeButtonActionValue(propDef.key, values);
    if (actionValue === "internal-link") {
      return propDef.label.replace("Link", "Internal Page");
    }
    if (actionValue === "custom-link") {
      return propDef.label.replace("Link", "Custom Link");
    }
  }

  return propDef.label;
}

export function shouldRenderConditionalField(
  propDef: Pick<PropDef, "key">,
  values: Record<string, unknown>,
) {
  const actionControllerKey = getActionControllerKey(propDef.key);
  if (!actionControllerKey) return true;

  const actionValue = normalizeButtonActionValue(propDef.key, values);

  if (propDef.key === "link" || propDef.key.endsWith("Link")) {
    return actionValue === "internal-link" || actionValue === "custom-link";
  }

  if (propDef.key === "openInNewTab" || propDef.key.endsWith("OpenInNewTab")) {
    return actionValue === "custom-link";
  }

  if (
    propDef.key === "formSlug" ||
    propDef.key === "modalTitle" ||
    propDef.key === "modalDescription" ||
    propDef.key.endsWith("FormSlug") ||
    propDef.key.endsWith("ModalTitle") ||
    propDef.key.endsWith("ModalDescription")
  ) {
    return actionValue === "form-modal";
  }

  return true;
}

export function shouldUseRichTextEditor(propDef: Pick<PropDef, "type" | "key">) {
  return (
    propDef.type === "richtext" ||
    propDef.key === "subtitle" ||
    propDef.key === "subheading" ||
    propDef.key === "answer"
  );
}
