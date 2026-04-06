import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import * as React from "react"

import { PlaceholderPattern } from "@/components/ui/placeholder-pattern"
import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-200 data-[state=open]:duration-300",
        className
      )}
      {...props}
    >
      <PlaceholderPattern
        patternSize={8}
        className="size-full stroke-white/[0.04]"
      />
    </DialogPrimitive.Overlay>
  )
}

// Notched close button — chamfered top-right corner with diagonal cut
function DialogCloseNotch() {
  // The notch is drawn in a 60x60 box anchored to top-right.
  // Shape: top-left corner has a diagonal going from the left edge to the bottom edge,
  // with rounded ends. The rest fills the top-right rectangle.
  //
  //  (0,12)___
  //        \   ← rounded curve
  //         \
  //          \
  //           \___
  //     (44,56)   (60,56)
  //
  // Top and right edges are straight (hidden by dialog border).

  const shape = [
    'M 14 0',           // start on the top edge
    'L 60 0',           // top-right
    'L 60 60',          // bottom-right
    'L 48 60',          // along bottom to curve start
    'Q 42 60, 38 56',   // round into the diagonal
    'L 2 20',           // the diagonal line
    'Q 0 18, 0 14',     // round into the left edge
    'L 0 0',            // up to top-left corner
    'Z',
  ].join(' ')

  const border = [
    'M 0 14',           // start on left edge
    'Q 0 18, 2 20',     // curve out of the left edge
    'L 38 56',          // the diagonal
    'Q 42 60, 48 60',   // curve into the bottom edge
  ].join(' ')

  return (
    <DialogPrimitive.Close
      className="group absolute top-0 right-0 z-10 cursor-pointer focus:outline-none"
      style={{ width: 60, height: 60 }}
    >
      <svg
        viewBox="0 0 60 60"
        className="absolute inset-0 size-full"
        fill="none"
      >
        <defs>
          <pattern id="notch-diag" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <g transform="scale(0.4)">
              <path d="M-3 13 15-5M-5 5l18-18M-1 21 17 3" className="stroke-current opacity-[0.1]" />
            </g>
          </pattern>
        </defs>
        <path d={shape} className="fill-muted/50 transition-colors group-hover:fill-muted/80" />
        <path d={shape} fill="url(#notch-diag)" />
        <path d={border} className="stroke-border/50" strokeWidth={1} fill="none" />
      </svg>
      <span className="absolute top-[15px] right-[15px] flex items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground">
        <XIcon className="size-4" />
      </span>
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border p-6 shadow-2xl sm:max-w-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[52%] data-[state=closed]:duration-200 data-[state=open]:duration-300",
          className
        )}
        {...props}
      >
        {children}
        <DialogCloseNotch />
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function DialogContentFull({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background fixed inset-[5%] z-50 flex flex-col overflow-hidden rounded-xl border shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.985] data-[state=open]:zoom-in-[0.985] data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[4%] data-[state=closed]:duration-200 data-[state=open]:duration-300",
          className
        )}
        {...props}
      >
        {children}
        <DialogCloseNotch />
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogContentFull,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
