import type { Metadata } from "next";
import { createElement, type ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "Game asset uploader",
  description: "Upload game art directly from the browser with a presigned URL.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return createElement("html", { lang: "en" }, createElement("body", null, children));
}
