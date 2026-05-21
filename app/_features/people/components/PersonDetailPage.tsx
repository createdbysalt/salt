"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import {
  MOCK_PEOPLE,
  MOCK_ORGANIZATIONS,
  MOCK_PROJECTS,
  MOCK_PERSON_ACTIVITIES,
} from "@/app/_lib/demo";
import type { MockPerson } from "@/app/_lib/demo";
import { PersonDetailBannerTitle } from "./person-detail/PersonDetailBannerTitle";
import { PersonDetailMeta } from "./person-detail/PersonDetailMeta";
import { PersonOverviewTab } from "./person-detail/tabs/PersonOverviewTab";
import { PersonActivityTab } from "./person-detail/tabs/PersonActivityTab";
import { PersonNotesTab } from "./person-detail/tabs/PersonNotesTab";
import { getPersonConnections } from "./person-detail/getPersonConnections";
import { PersonConnectionsTab } from "./person-detail/tabs/PersonConnectionsTab";
import { PersonFilesTab } from "./person-detail/tabs/PersonFilesTab";
import { PersonPaymentsTab } from "./person-detail/tabs/PersonPaymentsTab";
import { getMockPersonPayments } from "./person-detail/getMockPersonPayments";
import {
  PERSON_DETAIL_TABS,
  isPersonDetailTab,
  type PersonDetailTab,
} from "./person-detail/types";
import {
  draftMessageForPerson,
  getPersonPrimaryActionLabel,
} from "./person-detail/utils";

export function PersonDetailPage({ personId }: { personId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const seedPerson = MOCK_PEOPLE.find((p) => p.id === personId);
  const [person, setPerson] = React.useState<MockPerson | null>(seedPerson ?? null);

  React.useEffect(() => {
    const next = MOCK_PEOPLE.find((p) => p.id === personId);
    setPerson(next ?? null);
  }, [personId]);

  const tabFromUrl = searchParams.get("tab");
  const activeTab: PersonDetailTab = isPersonDetailTab(tabFromUrl)
    ? tabFromUrl
    : "overview";

  const setTab = React.useCallback(
    (tab: PersonDetailTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(
        `/people/${personId}${query ? `?${query}` : ""}`,
        { scroll: false }
      );
    },
    [router, searchParams, personId]
  );

  const updatePerson = React.useCallback((patch: Partial<MockPerson>) => {
    setPerson((current) => (current ? { ...current, ...patch } : current));
    // TODO: persist via server action when people API is wired
  }, []);

  if (!person) return null;

  const organization = person.organizationId
    ? MOCK_ORGANIZATIONS.find((o) => o.id === person.organizationId)
    : undefined;

  const personProjects = MOCK_PROJECTS.filter(
    (p) => p.organizationId === person.organizationId
  );

  const personActivities = MOCK_PERSON_ACTIVITIES.filter(
    (a) => a.personId === personId
  );

  const personConnections = getPersonConnections(person);
  const personPayments = getMockPersonPayments(person);

  const bannerTabs = PERSON_DETAIL_TABS.map((tab) => ({
    label: tab.label,
    value: tab.id,
  }));

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        breadcrumbs={
          <Link
            href="/people"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            People
          </Link>
        }
        titleContent={
          <PersonDetailBannerTitle person={person} onUpdatePerson={updatePerson} />
        }
        subtitleContent={<PersonDetailMeta person={person} />}
        tabs={bannerTabs}
        activeTab={activeTab}
        onTabChange={(value) => setTab(value as PersonDetailTab)}
        fullWidthDivider
        actions={
          <Button size="sm" className="cursor-pointer" onClick={() => draftMessageForPerson(person)}>
            <MessageSquare className="size-3.5" />
            {getPersonPrimaryActionLabel()}
          </Button>
        }
      />

      {activeTab === "overview" && (
        <PersonOverviewTab
          person={person}
          personId={personId}
          projects={personProjects}
          organization={organization}
          organizations={MOCK_ORGANIZATIONS}
          onUpdatePerson={updatePerson}
        />
      )}
      {activeTab === "activity" && (
        <PersonActivityTab
          activities={personActivities}
          personName={person.name}
        />
      )}
      {activeTab === "notes" && (
        <PersonNotesTab person={person} onUpdatePerson={updatePerson} />
      )}
      {activeTab === "connections" && (
        <PersonConnectionsTab connections={personConnections} />
      )}
      {activeTab === "payments" && (
        <PersonPaymentsTab personName={person.name} payments={personPayments} />
      )}
      {activeTab === "files" && <PersonFilesTab person={person} />}
    </div>
  );
}
