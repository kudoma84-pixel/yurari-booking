"use client";
import { SessionProvider } from "next-auth/react";

export default function SrcLayout({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
