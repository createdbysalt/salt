"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
} from "@repo/ui";
import {
  createStudioService,
  updateStudioService,
  deleteStudioService,
} from "../../actions";
import { useStudioServices } from "../../hooks/useStudioServices";

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required").max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  pricing_type: z.enum(["fixed", "hourly", "retainer", "custom"]).optional(),
  price_min: z.coerce.number().min(0).optional().nullable(),
  price_max: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).optional(),
  typical_timeline: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface StudioService {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricing_type: "fixed" | "hourly" | "retainer" | "custom" | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  typical_timeline: string | null;
  is_active: boolean;
}

interface ServiceFormProps {
  service?: StudioService;
  onSuccess: () => void;
  onCancel: () => void;
}

function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service
      ? {
          name: service.name,
          description: service.description || "",
          category: service.category || "",
          pricing_type: service.pricing_type || undefined,
          price_min: service.price_min,
          price_max: service.price_max,
          currency: service.currency as ServiceFormData["currency"],
          typical_timeline: service.typical_timeline || "",
          is_active: service.is_active,
        }
      : {
          name: "",
          description: "",
          category: "",
          pricing_type: undefined,
          price_min: null,
          price_max: null,
          currency: "USD",
          typical_timeline: "",
          is_active: true,
        },
  });

  const onSubmit = (data: ServiceFormData) => {
    startTransition(async () => {
      const payload = {
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        pricing_type: data.pricing_type || null,
        price_min: data.price_min ?? null,
        price_max: data.price_max ?? null,
        currency: data.currency || "USD",
        typical_timeline: data.typical_timeline || null,
        is_active: data.is_active ?? true,
      };

      const result = service
        ? await updateStudioService(service.id, payload)
        : await createStudioService(payload);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(service ? "Service updated" : "Service created");
      onSuccess();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Service Name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Web Design"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="What's included in this service..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          {...register("category")}
          placeholder="Design, Development, Strategy..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pricing_type">Pricing Type</Label>
          <Select
            value={watch("pricing_type") || ""}
            onValueChange={(value) =>
              setValue("pricing_type", value as ServiceFormData["pricing_type"])
            }
          >
            <SelectTrigger id="pricing_type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Price</SelectItem>
              <SelectItem value="hourly">Hourly Rate</SelectItem>
              <SelectItem value="retainer">Retainer</SelectItem>
              <SelectItem value="custom">Custom Quote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={watch("currency")}
            onValueChange={(value) =>
              setValue("currency", value as ServiceFormData["currency"])
            }
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD ($)</SelectItem>
              <SelectItem value="AUD">AUD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price_min">Min Price</Label>
          <Input
            id="price_min"
            type="number"
            {...register("price_min")}
            placeholder="1000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_max">Max Price</Label>
          <Input
            id="price_max"
            type="number"
            {...register("price_max")}
            placeholder="5000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="typical_timeline">Typical Timeline</Label>
        <Input
          id="typical_timeline"
          {...register("typical_timeline")}
          placeholder="2-4 weeks"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
          {service ? "Update" : "Create"} Service
        </Button>
      </div>
    </form>
  );
}

export function ServicesSection() {
  const { services, isLoading, mutate } = useStudioServices();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<StudioService | null>(null);
  const [deletingServiceId, setDeletingServiceId] = React.useState<string | null>(
    null
  );
  const [isDeleting, startDeleteTransition] = React.useTransition();

  const handleEdit = (service: StudioService) => {
    setEditingService(service);
    setIsSheetOpen(true);
  };

  const handleDelete = (serviceId: string) => {
    startDeleteTransition(async () => {
      const result = await deleteStudioService(serviceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Service deleted");
        mutate();
      }
      setDeletingServiceId(null);
    });
  };

  const handleFormSuccess = () => {
    setIsSheetOpen(false);
    setEditingService(null);
    mutate();
  };

  const formatPrice = (
    min: number | null,
    max: number | null,
    currency: string,
    type: string | null
  ) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    });

    if (type === "retainer") {
      if (min) return `${formatter.format(min)}/mo`;
      return "Custom";
    }

    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return "Custom";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Your service offerings for proposals
            </CardDescription>
          </div>
          <Sheet
            open={isSheetOpen}
            onOpenChange={(open) => {
              setIsSheetOpen(open);
              if (!open) setEditingService(null);
            }}
          >
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="size-4 mr-2" />
                Add Service
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>
                  {editingService ? "Edit Service" : "Add Service"}
                </SheetTitle>
                <SheetDescription>
                  {editingService
                    ? "Update your service details"
                    : "Add a new service to your catalog"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <ServiceForm
                  service={editingService || undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={() => {
                    setIsSheetOpen(false);
                    setEditingService(null);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          {!services?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="size-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No services yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first service to include in proposals
              </p>
              <Button size="sm" onClick={() => setIsSheetOpen(true)}>
                <Plus className="size-4 mr-2" />
                Add Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.category || "—"}
                    </TableCell>
                    <TableCell>
                      {formatPrice(
                        service.price_min,
                        service.price_max,
                        service.currency,
                        service.pricing_type
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={service.is_active ? "default" : "secondary"}
                      >
                        {service.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(service)}
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingServiceId(service.id)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deletingServiceId}
        onOpenChange={(open) => !open && setDeletingServiceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              service from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingServiceId && handleDelete(deletingServiceId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
