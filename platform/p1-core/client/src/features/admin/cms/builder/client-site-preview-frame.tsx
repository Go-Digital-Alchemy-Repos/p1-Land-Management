import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  clientSitePreviewMessageSchema,
  clientSitePreviewReadySchema,
  type ClientSitePreviewMessage,
} from "@shared/client-site-preview";

interface ClientSitePreviewFrameProps {
  src: string;
  title: string;
  message: ClientSitePreviewMessage;
  className?: string;
}

export function ClientSitePreviewFrame({
  src,
  title,
  message,
  className,
}: ClientSitePreviewFrameProps): JSX.Element {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const targetOrigin = useMemo(() => new URL(src).origin, [src]);
  const validatedMessage = useMemo(() => clientSitePreviewMessageSchema.parse(message), [message]);

  const sendPreview = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(validatedMessage, targetOrigin);
  }, [targetOrigin, validatedMessage]);

  useEffect(sendPreview, [sendPreview]);
  useEffect(() => {
    const receiveReady = (event: MessageEvent) => {
      if (event.origin !== targetOrigin || event.source !== frameRef.current?.contentWindow) return;
      const ready = clientSitePreviewReadySchema.safeParse(event.data);
      if (
        ready.success &&
        ready.data.clientStackId === validatedMessage.clientStackId &&
        ready.data.routeId === validatedMessage.routeId &&
        ready.data.componentKey === validatedMessage.componentKey
      ) {
        sendPreview();
      }
    };
    window.addEventListener("message", receiveReady);
    return () => window.removeEventListener("message", receiveReady);
  }, [sendPreview, targetOrigin, validatedMessage]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className={className}
      sandbox="allow-same-origin allow-scripts"
      onLoad={sendPreview}
      data-testid="client-site-preview-frame"
    />
  );
}
