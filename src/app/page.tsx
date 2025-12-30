// app/page.tsx
import Board from "@/components/Board";
import VersionFooter from "@/components/VersionFooter";

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Board />
      <VersionFooter />
    </main>
  );
}