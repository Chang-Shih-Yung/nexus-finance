"use client"

import { useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Preview from "@/components/Preview"
import Preview02 from "@/components/Preview02"

function deriveItem(searchParams: ReturnType<typeof useSearchParams>) {
  return searchParams.get("item") === "preview-02" ? "preview-02" as const : "preview" as const
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [item, setItem] = useState<"preview" | "preview-02">(() => deriveItem(searchParams))

  // Sync URL → state during render (no effect needed)
  const derived = deriveItem(searchParams)
  if (derived !== item) {
    setItem(derived)
  }

  const switchTo = useCallback((target: "preview" | "preview-02") => {
    setItem(target)
    const url = new URL(globalThis.location.href)
    url.searchParams.set("item", target)
    globalThis.history.replaceState(null, "", url.toString())
  }, [])

  const isPage2 = item === "preview-02"

  return (
    <div className="relative h-full">
      <div className="h-full overflow-auto">
        {/* 01 = Preview02 (finance), 02 = Preview (dev/tech) */}
        {isPage2 ? <Preview /> : <Preview02 />}
      </div>
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-0.5 rounded-full bg-neutral-950/90 backdrop-blur-xl ring-1 ring-neutral-800/50 shadow-xl p-1">
        <button
          onClick={() => switchTo("preview")}
          className={`min-w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            isPage2
              ? "text-white/40 hover:text-white/70"
              : "bg-white/15 text-white"
          }`}
        >
          01
        </button>
        <button
          onClick={() => switchTo("preview-02")}
          className={`min-w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            isPage2
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          02
        </button>
      </div>
    </div>
  )
}
