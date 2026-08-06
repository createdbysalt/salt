"use client";

import { useEffect, useState } from "react";

type TermageddonEmbedProps = {
  policyId: string;
  title: string;
};

function addAccordionArrows(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;

  container
    .querySelectorAll<HTMLElement>("summary.accordion-summary")
    .forEach((summary) => {
      const hasArrow = Array.from(summary.children).some((child) =>
        child.classList.contains("accordion-arrow"),
      );

      if (!hasArrow) {
        const arrow = document.createElement("span");
        arrow.className = "accordion-arrow";
        arrow.setAttribute("aria-hidden", "true");
        summary.appendChild(arrow);
      }
    });

  return container.innerHTML;
}

export function TermageddonEmbed({ policyId, title }: TermageddonEmbedProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/policy/${policyId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch policy");
        return res.text();
      })
      .then((html) => setContent(addAccordionArrows(html)))
      .catch(() => setError(true));
  }, [policyId]);

  if (error) {
    return (
      <div className="termageddon-embed" aria-label={title}>
        <p className="text-muted-foreground">
          Unable to load policy.{" "}
          <a
            href={`https://policies.termageddon.com/api/policy/${policyId}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-primary underline"
          >
            View it here
          </a>
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="termageddon-embed" aria-label={title}>
        <p className="text-muted-foreground">Loading policy...</p>
      </div>
    );
  }

  return (
    <div
      className="termageddon-embed"
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
