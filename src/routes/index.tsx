import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Uploader, type Doc } from "../components/Uploader";
import { Reader } from "../components/Reader";
import { docId, stripMarkdown, tokenize } from "../lib/rsvp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [doc, setDoc] = useState<Doc | null>(null);

  const parsed = useMemo(() => {
    if (!doc) return null;
    const isMd = doc.markdown ?? /\.(md|markdown)$/i.test(doc.name);
    const words = tokenize(isMd ? stripMarkdown(doc.text) : doc.text);
    return { words, id: docId(doc.name, doc.text) };
  }, [doc]);

  if (!doc || !parsed || parsed.words.length === 0) {
    return <Uploader onLoad={setDoc} />;
  }

  return <Reader title={doc.name} words={parsed.words} id={parsed.id} onClose={() => setDoc(null)} />;
}
