"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState, useTransition } from "react";
import { getBlogSearchHref } from "../blog-paths";

export function BlogSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [, startTransition] = useTransition();

  return (
    <form
      className="relative w-full shrink-0 md:w-[min(100%,20rem)] lg:w-[min(100%,24rem)]"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;

        startTransition(() => {
          router.push(getBlogSearchHref(trimmed));
        });
      }}
    >
      <label htmlFor="blog-search" className="sr-only">
        Search blog articles
      </label>
      <input
        id="blog-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="What would you like to read about?"
        className="w-full appearance-none border-0 bg-transparent py-1.5 pr-8 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      <button
        type="submit"
        className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
        aria-label="Search"
      >
        <Search className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </form>
  );
}
