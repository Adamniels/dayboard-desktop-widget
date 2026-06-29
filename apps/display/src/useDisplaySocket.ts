// Opens the WebSocket to the api and reports connection state. When the api broadcasts a
// change (FR-RT-1), it invokes onMessage so the caller can refetch. The api base URL comes
// from VITE_API_URL so the Mini can point at its Tailscale host, not localhost.
import { useEffect, useState } from "react";

type Status = "connecting" | "open" | "closed";

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  return base.replace(/^http/, "ws") + "/ws";
}

export function useDisplaySocket(onMessage?: () => void): Status {
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      socket = new WebSocket(wsUrl());
      socket.onopen = () => {
        setStatus("open");
        console.log("[display] connected to api");
      };
      socket.onmessage = () => {
        onMessage?.();
      };
      socket.onclose = () => {
        if (closed) return;
        setStatus("closed");
        retry = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [onMessage]);

  return status;
}
