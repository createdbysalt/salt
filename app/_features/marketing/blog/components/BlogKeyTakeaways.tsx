type BlogKeyTakeawaysProps = {
  items: string[];
};

export function BlogKeyTakeaways({ items }: BlogKeyTakeawaysProps) {
  if (!items.length) return null;

  return (
    <section
      className="blog-article-takeaways"
      aria-labelledby="blog-key-takeaways-heading"
    >
      <h2 id="blog-key-takeaways-heading">Key takeaways</h2>
      <ul className="speakable-blog-takeaway list-disc space-y-2 pl-4 text-foreground/85">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
