// Opens the WebSocket to the api and reports connection state. Parsed messages are passed
// to onMessage so the caller can refetch (FR-RT-1) or trigger a takeover (FR-REM-4).
import { useEffect, useRef, useState } from "react";

type Status = "connecting" | "open" | "closed";

export interface SocketMessage {
  type: string;
  [key: string]: unknown;
}

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  return base.replace(/^http/, "ws") + "/ws";
}

export function useDisplaySocket(onMessage?: (msg: SocketMessage) => void): Status {
  const [status, setStatus] = useState<Status>("connecting");
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

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
      socket.onmessage = (event) => {
        try {
          handlerRef.current?.(JSON.parse(String(event.data)) as SocketMessage);
        } catch {
          // ignore non-JSON frames
        }
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
  }, []);

  return status;
}
