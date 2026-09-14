import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium font-display tracking-tight ring-offset-background transition-[color,background-color,filter,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "btn-gradient text-white btn-pop",
        destructive: "bg-destructive text-destructive-foreground btn-pop",
        outline: "bg-[#aa2a5c] text-white btn-pop",
        secondary: "bg-secondary text-secondary-foreground btn-pop",
        ghost: "rounded-xl hover:bg-white/10 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        soft: "bg-rose-50 text-rose-600 hover:bg-rose-100",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        md: "h-10 px-5 rounded-lg",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
