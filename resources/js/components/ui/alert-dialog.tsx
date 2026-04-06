import * as AlertDialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern"
import { cn } from "@/lib/utils"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
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
    </AlertDialogPrimitive.Overlay>
  )
}

function AlertDialogCloseNotch() {
  const shape = [
    "M 14 0",
    "L 60 0",
    "L 60 60",
    "L 48 60",
    "Q 42 60, 38 56",
    "L 2 20",
    "Q 0 18, 0 14",
    "L 0 0",
    "Z",
  ].join(" ")

  const border = [
    "M 0 14",
    "Q 0 18, 2 20",
    "L 38 56",
    "Q 42 60, 48 60",
  ].join(" ")

  return (
    <AlertDialogPrimitive.Close
      className="group absolute top-0 right-0 z-10 cursor-pointer border-0 bg-transparent p-0 shadow-none outline-none hover:bg-transparent focus-visible:ring-0"
      style={{ width: 60, height: 60 }}
    >
      <svg
        viewBox="0 0 60 60"
        className="absolute inset-0 size-full"
        fill="none"
      >
        <defs>
          <pattern id="alert-notch-diag" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <g transform="scale(0.4)">
              <path d="M-3 13 15-5M-5 5l18-18M-1 21 17 3" className="stroke-current opacity-[0.1]" />
            </g>
          </pattern>
        </defs>
        <path d={shape} className="fill-muted/50 transition-colors group-hover:fill-muted/80" />
        <path d={shape} fill="url(#alert-notch-diag)" />
        <path d={border} className="stroke-border/50" strokeWidth={1} fill="none" />
      </svg>
      <span className="absolute top-[15px] right-[15px] flex items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground">
        <XIcon className="size-4" />
      </span>
      <span className="sr-only">Close</span>
    </AlertDialogPrimitive.Close>
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border p-6 shadow-2xl sm:max-w-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[52%] data-[state=closed]:duration-200 data-[state=open]:duration-300",
          className
        )}
        {...props}
      >
        {children}
        <AlertDialogCloseNotch />
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Close>) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(buttonVariants(), className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Close>) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
