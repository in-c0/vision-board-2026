// src/app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center h-screen bg-stone-50 gap-4 text-stone-800">
          <h2 className="text-2xl font-serif">Something went wrong!</h2>
          <p className="text-stone-500">We couldn't load your board.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}