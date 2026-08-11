"use client";

import { useRef, useCallback } from "react";
import { X, Download, FileText, ChevronDown, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import {
  MeetingPrepDocument,
  MeetingSummaryDocument,
  MeetingTranscriptDocument,
} from "./documents";
import type { MeetingDetailData } from "../queries";

export type MeetingDocumentType = "prep" | "summary" | "transcript";
import { exportToPdf, exportToDocx } from "../utils/document-export";

type MeetingDocumentViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: MeetingDocumentType;
  detailData: MeetingDetailData;
};

const DOCUMENT_TITLES: Record<MeetingDocumentType, string> = {
  prep: "Prep Notes",
  summary: "Summary",
  transcript: "Transcript",
};

export function MeetingDocumentViewer({
  open,
  onOpenChange,
  documentType,
  detailData,
}: MeetingDocumentViewerProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const meeting = detailData.meeting;

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(
    async (format: "pdf" | "docx") => {
      if (!meeting) return;

      const filename = `${meeting.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${documentType}`;

      if (format === "pdf") {
        exportToPdf(documentRef.current, filename);
      } else {
        await exportToDocx(documentRef.current, filename, {
          title: DOCUMENT_TITLES[documentType],
          meetingTitle: meeting.title,
        });
      }
    },
    [meeting, documentType],
  );

  if (!meeting) return null;

  const currentSummary = detailData.summaries.find((s) => s.isCurrent) ?? detailData.summaries[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[900px] w-[95vw] max-w-[900px] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-4">
          <DialogTitle className="font-display text-lg tracking-tight">
            {DOCUMENT_TITLES[documentType]}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground print:hidden"
            >
              <Printer className="size-4" strokeWidth={2} />
              Print
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition hover:bg-foreground/90 print:hidden"
                >
                  <Download className="size-4" strokeWidth={2} />
                  Download
                  <ChevronDown className="size-3" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                  <FileText className="mr-2 size-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("docx")}>
                  <FileText className="mr-2 size-4" />
                  Word (.docx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ml-2 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/50 hover:text-foreground print:hidden"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Document content */}
        <div className="flex-1 overflow-y-auto bg-muted/30 p-8 print:bg-white print:p-0">
          {documentType === "prep" && (
            <MeetingPrepDocument
              ref={documentRef}
              meeting={meeting}
              openActionItems={detailData.actionItems.filter((item) => !item.completed)}
            />
          )}
          {documentType === "summary" && (
            <MeetingSummaryDocument
              ref={documentRef}
              meeting={meeting}
              summary={currentSummary ?? null}
              decisions={detailData.decisions}
              actionItems={detailData.actionItems}
            />
          )}
          {documentType === "transcript" && (
            <MeetingTranscriptDocument
              ref={documentRef}
              meeting={meeting}
              transcript={detailData.transcript}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
