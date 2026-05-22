import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Sistema Interno POA 2026 — PROFEPA',
  robots: 'noindex, nofollow',
};

export default function InternoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {children}
    </div>
  );
}
