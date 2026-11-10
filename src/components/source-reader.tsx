"use client";
import { useMemo, useState } from "react";
import { documentSections } from "@/lib/document-review";

export default function SourceReader({ text, label = "Policy source" }: { text: string; label?: string }) {
  const sections = useMemo(() => documentSections(text), [text]);
  const [section, setSection] = useState(0), [query, setQuery] = useState(""),
    [lastMatch, setLastMatch] = useState(-1), [message, setMessage] = useState("");
  const current = Math.min(section, Math.max(0, sections.length - 1));
  return (
    <section aria-label={label} className="form-stack">
      {sections.length > 1 && <>
        <p>{text.length.toLocaleString()} characters · {sections.length} text sections · full text retained</p>
        <div className="source-reader-controls">
          <input aria-label={`Search ${label}`} placeholder="Find in full policy text" value={query} onChange={(e) => { setQuery(e.target.value); setLastMatch(-1); setMessage(""); }} />
          <button type="button" className="btn secondary" disabled={!query.trim()} onClick={() => {
            const needle = query.trim().toLowerCase(), haystack = text.toLowerCase();
            let at = haystack.indexOf(needle, lastMatch + 1);
            if (at < 0 && lastMatch >= 0) at = haystack.indexOf(needle);
            if (at < 0) { setMessage("No matching text found."); return; }
            let offset = 0, next = 0;
            while (next < sections.length - 1 && offset + sections[next].length <= at) offset += sections[next++].length;
            setSection(next); setLastMatch(at); setMessage(`Match in text section ${next + 1}.`);
          }}>{lastMatch >= 0 ? "Next Match" : "Find Text"}</button>
        </div>
        <div className="source-reader-controls">
          <button type="button" className="btn secondary" disabled={current === 0} onClick={() => setSection(current - 1)}>Previous Section</button>
          <label>Text section <select aria-label={`${label} text section`} value={current} onChange={(e) => setSection(Number(e.target.value))}>
            {sections.map((_, i) => <option key={i} value={i}>{i + 1} of {sections.length}</option>)}
          </select></label>
          <button type="button" className="btn secondary" disabled={current >= sections.length - 1} onClick={() => setSection(current + 1)}>Next Section</button>
        </div>
        {message && <p role="status">{message}</p>}
      </>}
      <pre className="source-full">{sections[current] || text}</pre>
    </section>
  );
}
