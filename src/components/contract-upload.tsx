"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContractUploadProps {
  onUploadComplete: () => void;
}

export function ContractUpload({ onUploadComplete }: ContractUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("Only PDF files are supported. Please select a .pdf file.");
      setStatusType("error");
      return;
    }
    setUploading(true);
    setStatus("Uploading and extracting...");
    setStatusType(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/contracts/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        id?: string;
        status?: string;
        error?: string;
      };
      if (res.ok) {
        setStatus(`Uploaded successfully. Status: ${data.status}`);
        setStatusType("success");
        onUploadComplete();
        setTimeout(() => {
          setStatus(null);
          setStatusType(null);
        }, 4000);
      } else {
        setStatus(`Error: ${data.error ?? "Upload failed"}`);
        setStatusType("error");
      }
    } catch {
      setStatus("Upload failed.");
      setStatusType("error");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <label
      htmlFor="pdf-upload"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors bg-card",
        isDragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <input
        id="pdf-upload"
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
        }}
      />
      {uploading ? (
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {status}
        </p>
      ) : (
        <>
          <p className="font-medium text-foreground">
            Drop a PDF contract here, or{" "}
            <Button variant="link" className="p-0 h-auto" asChild>
              <span>click to select</span>
            </Button>
          </p>
          {status && (
            <p
              className={cn(
                "mt-2 text-sm flex items-center justify-center gap-1.5",
                statusType === "success"
                  ? "text-emerald-600"
                  : statusType === "error"
                    ? "text-red-600"
                    : "text-muted-foreground",
              )}
            >
              {statusType === "success" && (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              {statusType === "error" && (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              {status}
            </p>
          )}
        </>
      )}
    </label>
  );
}
