import { CircleAlert, FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";

export function Busy({ label }: { label: string }) {
  return <div className="state-panel" role="status"><LoaderCircle className="spinner" size={18} aria-hidden="true" />{label}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-panel error-panel" role="alert">
      <CircleAlert size={20} aria-hidden="true" />
      <p>{message}</p>
      {retry && <Button type="button" variant="outline" size="sm" onClick={retry}>Coba Lagi</Button>}
    </div>
  );
}

export function EstimateNotice() {
  return (
    <div className="estimate-notice">
      <FlaskConical size={18} aria-hidden="true" />
      <p>Estimasi berbasis data dan asumsi yang dimasukkan.</p>
    </div>
  );
}
