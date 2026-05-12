"use client"

import { useState, useEffect } from "react"
import { Monitor } from "lucide-react"

const MIN_WIDTH = 1024 // Minimum laptop width

export function ScreenSizeGuard({ children }: { children: React.ReactNode }) {
  const [isLargeEnough, setIsLargeEnough] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const checkSize = () => {
      setIsLargeEnough(window.innerWidth >= MIN_WIDTH)
    }

    // Check on mount
    checkSize()

    // Check on resize
    window.addEventListener("resize", checkSize)
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  if (!isLargeEnough) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
          <div className="p-4 rounded-full bg-primary/10 mb-6">
            <Monitor className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Larger Screen Required
          </h1>
          <p className="text-muted-foreground mb-6">
            This application requires a laptop or desktop screen to ensure optimal usability for annotation and review tasks.
          </p>
          <p className="text-sm text-muted-foreground">
            Please access this platform from a device with a minimum screen width of {MIN_WIDTH}px.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
