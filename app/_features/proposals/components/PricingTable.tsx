"use client";

/**
 * PricingTable Component
 *
 * Editable table for proposal pricing/investment section.
 * Allows adding/removing line items and payment schedule items.
 */

import { useState, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/app/_components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { PaymentScheduleItem, Currency } from "../types";
import { SUPPORTED_CURRENCIES, PAYMENT_STATUS } from "../types";

interface PricingTableProps {
  totalAmount: number | null;
  currency: Currency;
  paymentSchedule: PaymentScheduleItem[];
  onChange: (data: {
    totalAmount: number | null;
    currency: Currency;
    paymentSchedule: PaymentScheduleItem[];
  }) => void;
  disabled?: boolean;
}

export function PricingTable({
  totalAmount,
  currency,
  paymentSchedule,
  onChange,
  disabled = false,
}: PricingTableProps) {
  // Add new payment schedule item
  const handleAddItem = useCallback(() => {
    const newItem: PaymentScheduleItem = {
      amount: 0,
      due_date: new Date().toISOString().split("T")[0],
      description: "",
      status: PAYMENT_STATUS.PENDING,
    };
    onChange({
      totalAmount,
      currency,
      paymentSchedule: [...paymentSchedule, newItem],
    });
  }, [totalAmount, currency, paymentSchedule, onChange]);

  // Remove payment schedule item
  const handleRemoveItem = useCallback(
    (index: number) => {
      const updated = paymentSchedule.filter((_, i) => i !== index);
      onChange({
        totalAmount,
        currency,
        paymentSchedule: updated,
      });
    },
    [totalAmount, currency, paymentSchedule, onChange]
  );

  // Update a payment schedule item
  const handleUpdateItem = useCallback(
    (index: number, field: keyof PaymentScheduleItem, value: unknown) => {
      const updated = paymentSchedule.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      });
      onChange({
        totalAmount,
        currency,
        paymentSchedule: updated,
      });
    },
    [totalAmount, currency, paymentSchedule, onChange]
  );

  // Update total amount
  const handleTotalChange = useCallback(
    (value: string) => {
      const numValue = value === "" ? null : parseFloat(value);
      onChange({
        totalAmount: numValue,
        currency,
        paymentSchedule,
      });
    },
    [currency, paymentSchedule, onChange]
  );

  // Update currency
  const handleCurrencyChange = useCallback(
    (value: string) => {
      onChange({
        totalAmount,
        currency: value as Currency,
        paymentSchedule,
      });
    },
    [totalAmount, paymentSchedule, onChange]
  );

  // Format currency for display
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate schedule total
  const scheduleTotal = paymentSchedule.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Total Amount & Currency */}
      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Total Project Amount
          </label>
          <Input
            type="number"
            placeholder="0.00"
            value={totalAmount ?? ""}
            onChange={(e) => handleTotalChange(e.target.value)}
            disabled={disabled}
            min={0}
            step={0.01}
          />
        </div>
        <div className="w-32">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Currency
          </label>
          <Select
            value={currency}
            onValueChange={handleCurrencyChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-muted-foreground">
            Payment Schedule
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={disabled}
          >
            <Plus className="size-4 mr-1" />
            Add Milestone
          </Button>
        </div>

        {paymentSchedule.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p className="text-sm">No payment milestones defined.</p>
            <p className="text-xs mt-1">
              Click "Add Milestone" to create a payment schedule.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead className="w-[20%]">Amount</TableHead>
                <TableHead className="w-[25%]">Due Date</TableHead>
                <TableHead className="w-[15%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentSchedule.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      placeholder="e.g., Project Kickoff (50%)"
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateItem(index, "description", e.target.value)
                      }
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={item.amount || ""}
                      onChange={(e) =>
                        handleUpdateItem(
                          index,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={disabled}
                      min={0}
                      step={0.01}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={item.due_date}
                      onChange={(e) =>
                        handleUpdateItem(index, "due_date", e.target.value)
                      }
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveItem(index)}
                      disabled={disabled}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(scheduleTotal)}
                </TableCell>
                <TableCell colSpan={2}>
                  {totalAmount && scheduleTotal !== totalAmount && (
                    <span className="text-xs text-amber-600">
                      Schedule ({formatCurrency(scheduleTotal)}) differs from
                      total ({formatCurrency(totalAmount)})
                    </span>
                  )}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
