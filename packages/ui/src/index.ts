// @repo/ui - UI component library for salt-core
// Vanilla shadcn components - zero customization
// Barrel export - all public APIs

// Layout
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './primitives/card'
export { Separator } from './primitives/separator'
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './primitives/accordion'

// Forms
export { Button, buttonVariants } from './primitives/button'
export { AIButton, aiButtonVariants } from './primitives/ai-button'
export { Input } from './primitives/input'
export { PhoneInput, type PhoneInputProps } from './primitives/phone-input'
export { Textarea } from './primitives/textarea'
export { Label } from './primitives/label'
export { Checkbox } from './primitives/checkbox'
export { Switch } from './primitives/switch'
export { RadioGroup, RadioGroupItem } from './primitives/radio-group'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './primitives/select'
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './primitives/form'

// Range
export { Slider } from './primitives/slider'

// Calendar & DatePicker
export { Calendar, CalendarDayButton } from './primitives/calendar'
export {
  CalendarPanel,
  calendarPopoverClassName,
  getCalendarMonthBounds,
  parseFlexibleDate,
  parseIsoDate,
  toIsoDate,
} from './primitives/calendar-panel'
export { DatePicker } from './primitives/date-picker'
export type { DatePickerProps } from './primitives/date-picker'

// Input Group
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from './primitives/input-group'

// Feedback
export { Badge, badgeVariants } from './primitives/badge'
export { StatusPill, EntityChip, type StatusPillProps, type EntityChipProps } from './primitives/status-pill'
export { Alert, AlertTitle, AlertDescription } from './primitives/alert'
export { Progress } from './primitives/progress'
export { Skeleton } from './primitives/skeleton'
export { Toaster as SonnerToaster } from './primitives/sonner'

// Overlays
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './primitives/dialog'
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './primitives/sheet'
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './primitives/alert-dialog'
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './primitives/dropdown-menu'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './primitives/tooltip'
export { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from './primitives/command'

// Data Display
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from './primitives/tabs'
export { Avatar, AvatarImage, AvatarFallback } from './primitives/avatar'
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './primitives/table'

// Navigation
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  getPaginationRange,
} from './primitives/pagination'
export type { PaginationRangeItem } from './primitives/pagination'
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './primitives/breadcrumb'
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './primitives/sidebar'

// Toggle
export { Toggle, toggleVariants } from './primitives/toggle'
export { ToggleGroup, ToggleGroupItem } from './primitives/toggle-group'

// Collapsible
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './primitives/collapsible'

// Charts
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from './primitives/chart'
export type { ChartConfig } from './primitives/chart'

// Hooks
export { useIsMobile } from './hooks/use-mobile'

// Drawer
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './primitives/drawer'

// Dashboard Components (from shadcn dashboard-01 block)
export { AppSidebar } from './primitives/app-sidebar'
export { ChartAreaInteractive } from './primitives/chart-area-interactive'
export { DataTable } from './primitives/data-table'
export { NavDocuments } from './primitives/nav-documents'
export { NavMain } from './primitives/nav-main'
export { NavSecondary } from './primitives/nav-secondary'
export { NavUser } from './primitives/nav-user'
export { SectionCards } from './primitives/section-cards'
export { SiteHeader } from './primitives/site-header'

// Resizable Panels
export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './primitives/resizable'

// Combobox (multi-select with chips)
export { MultiSelectCombobox } from './primitives/combobox'
export type { ComboboxItem, ComboboxProps } from './primitives/combobox'
export * from './primitives/typography'

// Effects (Magic UI + Aceternity UI)
export {
  BorderBeam,
  ShimmerButton,
  MagicCard,
  SparklesCore,
  Sparkles,
  BackgroundBeams,
  TextGenerateEffect,
} from './effects'
