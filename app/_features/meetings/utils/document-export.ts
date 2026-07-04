/**
 * Export PDF using browser print dialog
 * The user can then save as PDF from the print dialog
 */
export function exportToPdf(
  element: HTMLElement | null,
  filename: string,
): void {
  if (!element) return;

  // Store original title to restore later
  const originalTitle = document.title;

  // Set document title (used as default filename in print dialog)
  document.title = filename;

  // Trigger print
  window.print();

  // Restore original title after a short delay
  setTimeout(() => {
    document.title = originalTitle;
  }, 100);
}

type DocxOptions = {
  title: string;
  meetingTitle: string;
};

/**
 * Export to DOCX using the docx library
 * Dynamically imports the library to avoid bundle bloat
 */
export async function exportToDocx(
  element: HTMLElement | null,
  filename: string,
  options: DocxOptions,
): Promise<void> {
  if (!element) return;

  try {
    // Dynamically import docx library
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

    // Extract text content from the element
    // This is a simplified extraction - for more complex formatting,
    // you'd need to walk the DOM tree and preserve structure
    type ParagraphInstance = InstanceType<typeof Paragraph>;
    const extractContent = (el: HTMLElement): ParagraphInstance[] => {
      const paragraphs: ParagraphInstance[] = [];

      // Add title
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: options.title.toUpperCase(),
              bold: true,
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        }),
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: options.meetingTitle,
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 },
        }),
      );

      // Extract all text nodes
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
      );

      let currentParagraphTexts: string[] = [];
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (text) {
          const parent = node.parentElement;

          // Check if this is a heading
          if (parent?.tagName.match(/^H[1-6]$/)) {
            // Flush current paragraph
            if (currentParagraphTexts.length > 0) {
              paragraphs.push(
                new Paragraph({
                  children: [new TextRun(currentParagraphTexts.join(" "))],
                  spacing: { after: 200 },
                }),
              );
              currentParagraphTexts = [];
            }

            const level = parseInt(parent.tagName[1]);
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: text.toUpperCase(),
                    bold: true,
                    size: 24 - level * 2,
                  }),
                ],
                spacing: { before: 300, after: 200 },
              }),
            );
          } else if (parent?.tagName === "P" || parent?.closest("p")) {
            currentParagraphTexts.push(text);
          } else if (parent?.tagName === "LI") {
            // Flush current paragraph
            if (currentParagraphTexts.length > 0) {
              paragraphs.push(
                new Paragraph({
                  children: [new TextRun(currentParagraphTexts.join(" "))],
                  spacing: { after: 200 },
                }),
              );
              currentParagraphTexts = [];
            }

            paragraphs.push(
              new Paragraph({
                children: [new TextRun(`• ${text}`)],
                spacing: { after: 100 },
              }),
            );
          } else {
            currentParagraphTexts.push(text);
          }
        }
      }

      // Flush remaining text
      if (currentParagraphTexts.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(currentParagraphTexts.join(" "))],
            spacing: { after: 200 },
          }),
        );
      }

      return paragraphs;
    };

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: extractContent(element),
        },
      ],
    });

    // Generate the docx file
    const blob = await Packer.toBlob(doc);

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export DOCX:", error);
    // Fallback: alert the user
    alert("Failed to export as Word document. Please try PDF instead.");
  }
}
