import type { WidgetProps } from "@/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";

/**
 * Knowledge Base Shortcuts Widget
 * Shows curated links to resources and files
 */
export function KnowledgeBaseShortcutsWidget({ config, data }: WidgetProps) {
  const links = config.settings?.knowledgeBaseLinks || [];

  if (links.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Knowledge Base</h2>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>Helpful Resources</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {links.map((link) => (
              <Button
                key={link.id}
                variant="outline"
                className="justify-between h-auto py-3"
                asChild
              >
                <Link
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  <span className="text-sm font-medium">{link.title}</span>
                  {link.url.startsWith("http") && (
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

