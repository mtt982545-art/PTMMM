"use client";
import { useEffect } from "react";

/**
 * SWRegister
 * Mendaftarkan Service Worker hanya di production saat NEXT_PUBLIC_ENABLE_SW === "true".
 * Di development, memastikan tidak ada SW yang tertinggal (unregister semua).
 */
export default function SWRegister() {
  useEffect(() => {
    const isProd = process.env.NODE_ENV === "production";
    const enableFlag = process.env.NEXT_PUBLIC_ENABLE_SW === "true";

    const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;

    const ensureUnregisterAll = async () => {
      try {
        if (!hasSW) return;
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        // Optional: trigger clients to claim fresh state
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "FORCE_UNREGISTER" });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("SW unregister warning:", e);
      }
    };

    const registerSW = async () => {
      if (!hasSW) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // eslint-disable-next-line no-console
        console.info("Service Worker registered:", reg);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Service Worker registration failed:", e);
      }
    };

    if (isProd && enableFlag) {
      registerSW();
    } else {
      // Dev / flag off: pastikan tidak ada SW terpasang agar tidak ada 404 berulang.
      ensureUnregisterAll();
    }
  }, []);

  return null;
}