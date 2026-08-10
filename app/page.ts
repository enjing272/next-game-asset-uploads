"use client";

import { createElement, type FormEvent, useState } from "react";

type UploadTicket = { uploadUrl: string; key: string };
const h = createElement;

export default function GameAssetUploadPage() {
  const [status, setStatus] = useState("Choose an asset to begin.");
  const [busy, setBusy] = useState(false);

  async function uploadAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("asset");

    if (!(file instanceof File) || file.size === 0) {
      setStatus("Choose a non-empty file.");
      return;
    }

    setBusy(true);
    setStatus("Requesting an upload URL...");

    try {
      const ticketResponse = await fetch("/api/game-assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: values.get("playerId"),
          assetType: values.get("assetType"),
          filename: file.name,
        }),
      });

      if (!ticketResponse.ok) throw new Error("The upload ticket could not be created.");
      const ticket = (await ticketResponse.json()) as UploadTicket;

      setStatus("Uploading directly to storage...");
      const uploadResponse = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("The asset upload was not accepted.");
      setStatus(`Uploaded ${ticket.key}`);
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return h(
    "main",
    null,
    h("h1", null, "Ship the asset, skip the byte proxy."),
    h(
      "p",
      null,
      "The API route signs one object key. Your browser sends the texture, audio, or build artifact straight to storage.",
    ),
    h(
      "form",
      { onSubmit: uploadAsset },
      h(
        "label",
        null,
        "Player ID",
        h("input", { name: "playerId", pattern: "[A-Za-z0-9_-]{2,64}", defaultValue: "player-42", required: true }),
      ),
      h(
        "label",
        null,
        "Asset kind",
        h(
          "select",
          { name: "assetType", defaultValue: "texture" },
          h("option", { value: "texture" }, "Texture"),
          h("option", { value: "audio" }, "Audio"),
          h("option", { value: "build" }, "Build"),
        ),
      ),
      h("label", null, "File", h("input", { name: "asset", type: "file", required: true })),
      h("button", { type: "submit", disabled: busy }, busy ? "Uploading..." : "Upload asset"),
      h("p", { role: "status", "aria-live": "polite" }, status),
    ),
  );
}
