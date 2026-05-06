import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function DogPhotoUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setErr(null);

    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Max 10 MB. Try a smaller photo.");
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `quiz/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("dog-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("dog-photos").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex items-start gap-4">
          <img
            src={value}
            alt="Uploaded dog"
            className="h-28 w-28 rounded-2xl object-cover ring-1 ring-[rgba(31,27,22,0.12)]"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-full border border-[rgba(31,27,22,0.18)] bg-white px-4 py-2 text-sm font-medium text-[#1F1B16] hover:bg-[#FBF6EC]"
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Replace photo"}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-[rgba(31,27,22,0.55)] underline-offset-2 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[rgba(31,27,22,0.22)] bg-white/60 px-6 py-8 text-center transition hover:border-[#9C4520] hover:bg-[#FBF6EC] disabled:opacity-60"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9C4520]">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.5-3.5a2 2 0 0 0-2.83 0L5 21" />
          </svg>
          <div className="text-sm font-medium text-[#1F1B16]">
            {uploading ? "Uploading…" : "Choose a photo from your gallery"}
          </div>
          <div className="text-xs text-[rgba(31,27,22,0.55)]">JPG or PNG, up to 10 MB</div>
        </button>
      )}

      {err && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-[rgba(156,69,32,0.06)] px-3 py-2 text-xs text-[rgba(31,27,22,0.7)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#9C4520]">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          Your photo is stored securely and only used by our team to picture your dog while writing the song. We never share it or use it for anything else.
        </span>
      </div>
    </div>
  );
}
