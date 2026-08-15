"use client";

import { useState, useRef, useCallback } from "react";
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, ImagePlus, Undo, Redo, Code,
  Minus, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
  onImageUpload: (file: File) => Promise<string>;
}

export function BlogEditor({ value, onChange, onImageUpload }: BlogEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    setTimeout(() => { if (editorRef.current) onChange(editorRef.current.innerHTML); }, 0);
  }, [onChange]);

  const handleHeading = (level: string) => exec("formatBlock", level);

  const handleLink = () => {
    if (showLinkInput && linkUrl) { exec("createLink", linkUrl); setLinkUrl(""); setShowLinkInput(false); }
    else setShowLinkInput(true);
  };

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await onImageUpload(file);
        exec("insertHTML", `<figure><img src="${url}" alt="" style="max-width:100%;border-radius:12px;" /><figcaption style="text-align:center;font-size:0.85em;color:#777;margin-top:8px;">Ajouter une légende</figcaption></figure>`);
      } catch (e) { console.error("Upload failed:", e); }
      finally { setUploading(false); }
    };
    input.click();
  };

  const handleInput = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };

  const tb = "w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#2F2F2F] hover:bg-[#F3F4F6] transition-all disabled:opacity-40";

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[#F3F4F6] bg-[#FAFAF8]">
        <button type="button" onClick={() => handleHeading("H1")} className={tb} title="Titre 1"><Heading1 className="w-4 h-4" /></button>
        <button type="button" onClick={() => handleHeading("H2")} className={tb} title="Titre 2"><Heading2 className="w-4 h-4" /></button>
        <button type="button" onClick={() => handleHeading("H3")} className={tb} title="Titre 3"><Heading3 className="w-4 h-4" /></button>
        <button type="button" onClick={() => handleHeading("P")} className={tb} title="Paragraphe"><Type className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-[#E5E7EB] mx-1" />
        <button type="button" onClick={() => exec("bold")} className={tb} title="Gras"><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("italic")} className={tb} title="Italique"><Italic className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("underline")} className={tb} title="Souligné"><Underline className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-[#E5E7EB] mx-1" />
        <button type="button" onClick={() => exec("insertUnorderedList")} className={tb} title="Liste à puces"><List className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={tb} title="Liste numérotée"><ListOrdered className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("formatBlock", "BLOCKQUOTE")} className={tb} title="Citation"><Quote className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-[#E5E7EB] mx-1" />
        <button type="button" onClick={() => exec("justifyLeft")} className={tb} title="Gauche"><AlignLeft className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("justifyCenter")} className={tb} title="Centrer"><AlignCenter className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("justifyRight")} className={tb} title="Droite"><AlignRight className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-[#E5E7EB] mx-1" />
        <button type="button" onClick={handleLink} className={cn(tb, showLinkInput && "bg-[#EEF5EC] text-[#486B46]")} title="Lien"><Link2 className="w-4 h-4" /></button>
        <button type="button" onClick={handleImageUpload} disabled={uploading} className={tb} title="Image">
          {uploading ? <div className="w-4 h-4 border-2 border-[#486B46] border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => exec("insertHTML", "<hr style='border:none;border-top:2px solid #E8E5E0;margin:24px 0;' />")} className={tb} title="Ligne"><Minus className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-[#E5E7EB] mx-1" />
        <button type="button" onClick={() => exec("undo")} className={tb} title="Annuler"><Undo className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec("redo")} className={tb} title="Refaire"><Redo className="w-4 h-4" /></button>
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF8] border-b border-[#F3F4F6]">
          <Link2 className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://exemple.com"
            className="flex-1 text-sm bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 outline-none focus:border-[#486B46]"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleLink(); } }} />
          <button type="button" onClick={handleLink} className="text-xs font-semibold text-white bg-[#486B46] px-3 py-1.5 rounded-lg hover:bg-[#3A5A38]">Insérer</button>
          <button type="button" onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="text-xs text-[#9CA3AF] hover:text-[#2F2F2F]">Annuler</button>
        </div>
      )}

      <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={handleInput} onBlur={handleInput}
        className="blog-editor-content min-h-[400px] p-6 outline-none focus:outline-none"
        style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "1.8", color: "#2F2F2F" }}
        dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  );
}
