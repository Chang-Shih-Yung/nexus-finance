"use client"

import { useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Preview from "@/components/Preview"
import Preview02 from "@/components/Preview02"
import Preview03 from "@/components/Preview03"

type PageItem = "preview" | "preview-02" | "preview-03"

function deriveItem(searchParams: ReturnType<typeof useSearchParams>): PageItem {
  const raw = searchParams.get("item")
  if (raw === "preview-02") return "preview-02"
  if (raw === "preview-03") return "preview-03"
  return "preview"
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [item, setItem] = useState<PageItem>(() => deriveItem(searchParams))

  // Sync URL → state during render (no effect needed)
  const derived = deriveItem(searchParams)
  if (derived !== item) {
    setItem(derived)
  }

  const switchTo = useCallback((target: PageItem) => {
    setItem(target)
    const url = new URL(globalThis.location.href)
    url.searchParams.set("item", target)
    globalThis.history.replaceState(null, "", url.toString())
  }, [])

  const btnClass = (target: PageItem) =>
    `min-w-8 h-8 rounded-full text-sm font-medium transition-colors ${
      item === target
        ? "bg-white/15 text-white"
        : "text-white/40 hover:text-white/70"
    }`

  return (
    <div className="relative h-full">
      <div className="h-full overflow-auto">
        {/* 01 = Preview02 (finance cards), 02 = Preview (design showcase), 03 = Executive dashboard */}
        {item === "preview-02" ? <Preview /> : item === "preview-03" ? <Preview03 /> : <Preview02 />}
      </div>
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-0.5 rounded-full bg-neutral-950/90 backdrop-blur-xl ring-1 ring-neutral-800/50 shadow-xl p-1">
        <button onClick={() => switchTo("preview")} className={btnClass("preview")}>01</button>
        <button onClick={() => switchTo("preview-02")} className={btnClass("preview-02")}>02</button>
        <button onClick={() => switchTo("preview-03")} className={btnClass("preview-03")}>03</button>
      </div>
    </div>
  )
}
