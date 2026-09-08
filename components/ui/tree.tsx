import React from "react"
import { ChevronRight, File, Folder } from "lucide-react"
import { cn } from "@/lib/utils"

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {
    data?: any[]
    initialSelectedId?: string
    indicator?: boolean
}

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("w-full rounded-md p-2 bg-background", className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Tree.displayName = "Tree"

interface TreeItemProps extends React.HTMLAttributes<HTMLDivElement> {
    level?: number
    defaultExpanded?: boolean
    label: string
    icon?: React.ReactNode
    isFolder?: boolean
    isSelected?: boolean
    onClick?: (e: React.MouseEvent) => void
    onToggle?: () => void
    leftContent?: React.ReactNode
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
    ({ className, level = 0, defaultExpanded = false, label, icon, isFolder, isSelected, onClick, onToggle, children, leftContent, ...props }, ref) => {
        const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

        const handleToggle = (e: React.MouseEvent) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
            onToggle?.()
        }

        return (
            <div ref={ref} className={cn("w-full select-none", className)} {...props}>
                <div
                    className={cn(
                        "flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors relative",
                        isSelected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted/50 text-foreground",
                        className
                    )}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={(e) => {
                        onClick?.(e)
                        if (isFolder) handleToggle(e)
                    }}
                >
                    {/* Indent guides could go here */}

                    <div className="flex items-center gap-2 w-full overflow-hidden">
                        {isFolder ? (
                            <ChevronRight
                                className={cn(
                                    "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground",
                                    isExpanded && "rotate-90"
                                )}
                            />
                        ) : (
                            <span className="w-4 h-4 shrink-0" />
                        )}

                        {icon ? (
                            <span className="shrink-0">{icon}</span>
                        ) : isFolder ? (
                            <Folder className="h-4 w-4 shrink-0 text-blue-500 fill-blue-500/20" />
                        ) : (
                            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}

                        <span className="truncate text-sm">{label}</span>
                        {leftContent}
                    </div>
                </div>
                {isExpanded && children && (
                    <div className="flex flex-col">
                        {children}
                    </div>
                )}
            </div>
        )
    }
)
TreeItem.displayName = "TreeItem"

export { Tree, TreeItem }
