// UI Primitives - Re-exports from @repo/ui for backward compatibility
// New code should import directly from @repo/ui

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./accordion";
export { Alert, AlertTitle, AlertDescription } from "./alert";
export { AlertDialog } from "./alert-dialog";
export { Avatar, AvatarImage, AvatarFallback } from "./avatar";
export { Badge } from "./badge";
export { Button, buttonVariants } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "./card";
export { Checkbox } from "./checkbox";
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut } from "./command";
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "./dialog";
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup } from "./dropdown-menu";
export { Input } from "./input";
export { Label } from "./label";
export { Progress } from "./progress";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator } from "./select";
export { Separator } from "./separator";
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "./sheet";
export { Skeleton } from "./skeleton";
export { Toaster } from "./sonner";
export { Switch } from "./switch";
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from "./table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export { Textarea } from "./textarea";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";

// Custom components (not shadcn)
export { Icon, AnimatedIcon } from "./icon";
export type { IconSize, IconAnimation, IconVariant } from "./icon";

// Re-export toast from sonner
export { toast } from "sonner";
