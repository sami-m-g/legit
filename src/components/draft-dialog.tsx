"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CrossVendorContext } from "@/lib/types";

interface DraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  draft: string;
  onDraftChange: (text: string) => void;
  crossVendorContext?: CrossVendorContext;
  footer: React.ReactNode;
}

export function DraftDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  draft,
  onDraftChange,
  crossVendorContext,
  footer,
}: DraftDialogProps) {
  const [editing, setEditing] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing((v) => !v)}
              className="shrink-0"
            >
              <Pencil className="w-3 h-3" />
              {editing ? "Preview" : "Edit"}
            </Button>
          </div>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              className="w-full min-h-[400px] rounded-lg border bg-muted/30 p-4 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <div className="draft-prose rounded-lg border bg-muted/30 p-4 min-h-[200px]">
              <Markdown>{draft}</Markdown>
            </div>
          )}
          {crossVendorContext?.sameVendor &&
            crossVendorContext.sameVendor.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Related: {crossVendorContext.sameVendor.length} other contract
                {crossVendorContext.sameVendor.length === 1 ? "" : "s"} with
                this vendor
              </p>
            )}
          {crossVendorContext?.insight && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
              {crossVendorContext.insight}
            </p>
          )}
        </div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
