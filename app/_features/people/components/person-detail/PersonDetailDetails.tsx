"use client";

import Link from "next/link";
import {
  Building2,
  Calendar,
  DollarSign,
  Mail,
  Network,
  Phone,
  Sparkles,
} from "lucide-react";
import type { MockOrganization, MockPerson } from "@/app/_lib/demo";
import { PropertyRow } from "@/app/_features/relationships/components/PropertyRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import {
  RELATIONSHIP_OPTIONS,
  formatLastContact,
  openAskSalt,
} from "./utils";

export function PersonDetailDetails({
  person,
  organization,
  organizations,
  onUpdatePerson,
}: {
  person: MockPerson;
  organization: MockOrganization | undefined;
  organizations: MockOrganization[];
  onUpdatePerson: (patch: Partial<MockPerson>) => void;
}) {
  return (
    <div className="max-w-xl px-4">
      <PropertyRow
        label="Relationship"
        value={
          <Select
            value={person.relationshipStatus}
            onValueChange={(relationshipStatus) =>
              onUpdatePerson({
                relationshipStatus:
                  relationshipStatus as MockPerson["relationshipStatus"],
              })
            }
          >
            <SelectTrigger className="h-7 border-none bg-transparent px-0 text-[13px] shadow-none hover:bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        icon={<Sparkles className="size-3.5" />}
      />
      <PropertyRow
        label="Title"
        value={person.title}
        placeholder="Add title"
        editable
        onSave={(title) => onUpdatePerson({ title: title || null })}
      />
      <PropertyRow
        label="Email"
        value={person.email}
        placeholder="Add email"
        type="email"
        editable
        onSave={(email) => onUpdatePerson({ email: email || null })}
        icon={<Mail className="size-3.5" />}
      />
      <PropertyRow
        label="Phone"
        value={person.phone}
        placeholder="Add phone"
        type="tel"
        editable
        onSave={(phone) => onUpdatePerson({ phone: phone || null })}
        icon={<Phone className="size-3.5" />}
      />
      <PropertyRow
        label="Company"
        icon={<Building2 className="size-3.5" />}
        value={
          <Select
            value={person.organizationId ?? "none"}
            onValueChange={(value) => {
              if (value === "none") {
                onUpdatePerson({ organizationId: null, organizationName: null });
                return;
              }
              const org = organizations.find((o) => o.id === value);
              onUpdatePerson({
                organizationId: value,
                organizationName: org?.name ?? null,
              });
            }}
          >
            <SelectTrigger className="h-7 border-none bg-transparent px-0 text-[13px] shadow-none hover:bg-muted/50">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <PropertyRow
        label="Client since"
        value={person.clientSince}
        placeholder="Not set"
        editable
        onSave={(clientSince) => onUpdatePerson({ clientSince: clientSince || null })}
        icon={<Calendar className="size-3.5" />}
      />
      <PropertyRow
        label="Last contact"
        value={formatLastContact(person.lastContactDays)}
      />
      <PropertyRow label="Activity" value={`${person.activityScore}%`} />
      <PropertyRow
        label="Outstanding"
        value={
          person.outstandingAmount > 0
            ? `$${person.outstandingAmount.toLocaleString()}`
            : "$0"
        }
        icon={<DollarSign className="size-3.5" />}
      />
      <PropertyRow
        label="Lifetime"
        value={`$${person.lifetimeValue.toLocaleString()}`}
      />

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          href="/connections"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Network className="size-3.5" />
          Open graph
        </Link>
        {organization ? (
          <Link
            href="/orgs"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Building2 className="size-3.5" />
            View organization
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => openAskSalt(`Prepare billing context for ${person.name}.`)}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <DollarSign className="size-3.5" />
          View billing
        </button>
      </div>
    </div>
  );
}
