import { CuedeckApp } from "@/components/CuedeckApp";
import { AppProviders } from "@/components/AppProviders";

export default function Home() {
  return (
    <AppProviders>
      <CuedeckApp />
    </AppProviders>
  );
}
