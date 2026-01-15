// @repo/ui - UI component library for salt-core
// Barrel export - all public APIs

// Core primitives (Phase P2.1 - Batch 1)
export { Button, buttonVariants } from './primitives/button'
export { Input } from './primitives/input'
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './primitives/card'
export { Badge, badgeVariants } from './primitives/badge'
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

// Core primitives (Phase P2.1 - Batch 2)
export { Label } from './primitives/label'
export { Separator } from './primitives/separator'
export { Spinner } from './primitives/spinner'
export { Skeleton } from './primitives/skeleton'
export { Avatar, AvatarImage, AvatarFallback } from './primitives/avatar'
export { Checkbox } from './primitives/checkbox'
export { Progress } from './primitives/progress'
export { Textarea } from './primitives/textarea'
export { Alert, AlertTitle, AlertDescription, AlertAction } from './primitives/alert'
export { Switch } from './primitives/switch'

// Core primitives (Phase P2.1 - Batch 3)
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './primitives/accordion'
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
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from './primitives/tabs'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './primitives/tooltip'
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
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './primitives/sheet'
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

// Core primitives (Phase P2.1 - Batch 4)
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
export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from './primitives/combobox'
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from './primitives/field'
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from './primitives/input-group'
export { GlassCard } from './primitives/glass-card'
export type { GlassCardProps } from './primitives/glass-card'
export { StatCard } from './primitives/stat-card'
export type { StatCardProps } from './primitives/stat-card'
export { Toaster as SonnerToaster } from './primitives/sonner'
export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './primitives/toast'
