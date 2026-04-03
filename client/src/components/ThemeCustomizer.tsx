'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import ThemeCustomizerContent from '@/components/ThemeCustomizerContent'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function ThemeCustomizer({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl"
        showCloseButton={true}
      >
        <SheetHeader className="px-4 pt-2 pb-0">
          <SheetTitle>自訂主題</SheetTitle>
          <SheetDescription>調整色彩、圓角和圖表配色</SheetDescription>
        </SheetHeader>
        <ThemeCustomizerContent />
      </SheetContent>
    </Sheet>
  )
}
