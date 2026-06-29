import { useDisplaySocket } from "./useDisplaySocket";

// Phase 0 placeholder. The calendar UI (from the approved prototype) arrives in Phase 1.
export function App() {
  const status = useDisplaySocket();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Dayboard Display</h1>
      <p>Phase 0 scaffold. Live calendar arrives in Phase 1.</p>
      <p>api channel: {status}</p>
    </main>
  );
}
