import App from "@/components/App";
import { PublikGate } from "@/components/PublikGate";

// The software lives here, behind Sign in with publik. The landing page at / is public.
export default function AppPage() {
  return (
    <PublikGate appName="Salon">
      <App />
    </PublikGate>
  );
}
