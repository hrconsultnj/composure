import type { ComponentType } from "react"

export type ExampleCategory = "Full Page" | "Canvas Preset" | "Component"

export interface ExampleEntry {
  slug: string
  title: string
  category: ExampleCategory
  index: string // '01', '02', etc.
  description: string
  components: string[] // which design-forge components are used
  load: () => Promise<{ default: ComponentType }>
}

export interface GallerySidebarProps {
  examples: ExampleEntry[]
  activeSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface GalleryHeaderProps {
  title: string
  index: string
  description: string
  components: string[]
  onOpenNav: () => void
}

export interface SidebarTreeProps {
  examples: ExampleEntry[]
  activeSlug: string
}

export interface SidebarItemProps {
  example: ExampleEntry
  isActive: boolean
}

export interface ExampleViewerProps {
  slug: string
}
