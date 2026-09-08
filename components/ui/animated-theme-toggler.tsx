import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;

    // Pre-calculate dimensions for circle animation
    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Set CSS variables for the animation
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);
    document.documentElement.style.setProperty('--max-radius', `${maxRadius}px`);

    // Use View Transition API if supported (no page reload)
    if ((document as any).startViewTransition) {
      const transition = (document as any).startViewTransition(() => {
        flushSync(() => {
          props.onClick?.(e);
        });
      });

      // Prevent default navigation behavior that can cause reload
      try {
        await transition.finished;
      } catch {
        // View transition was skipped — that's OK
      }
    } else {
      // Fallback: toggle directly without animation
      props.onClick?.(e);
    }
  }, [props.onClick])

  return (
    <button
      ref={buttonRef}
      {...props}
      onClick={toggleTheme}
      className={cn(className)}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
