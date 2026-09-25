"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ContentLink, Profile, SectionVisibility, StackTag } from "@/types";
import { proxyFetch } from "@/lib/api-client";
import styles from "./EditProfileModal.module.css";

const DEFAULT_VISIBILITY: SectionVisibility = { github: true, leetcode: true, games: true, interests: true };

export default function EditProfileModal({ profile, section = "profile", onClose }: { profile: Profile; section?: string; onClose: () => void }) {
  const router = useRouter();
  const isProfileSettings = section === "profile";
  const isLinksSettings = section === "links";
  const canEditLinks = isProfileSettings || isLinksSettings;
  const github = profile.content_links.find((link) => link.label.toLowerCase() === "github");
  const linkedin = profile.content_links.find((link) => link.label.toLowerCase() === "linkedin");
  const portfolio = profile.content_links.find((link) => !["github", "linkedin"].includes(link.label.toLowerCase()));
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [githubUrl, setGithubUrl] = useState(github?.url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(linkedin?.url || "");
  const [portfolioUrl, setPortfolioUrl] = useState(portfolio?.url || "");
  const [additionalLinks, setAdditionalLinks] = useState<ContentLink[]>(profile.content_links.filter((link) => !["github", "linkedin", "portfolio"].includes(link.label.toLowerCase())).slice(0, 10));
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [visibility, setVisibility] = useState(profile.section_visibility || DEFAULT_VISIBILITY);
  const [stackTags, setStackTags] = useState<StackTag[]>(profile.stack_tags);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StackTag[]>([]);
  const [unmatchedTokens, setUnmatchedTokens] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchStack = async (value: string) => {
    setSearch(value);
    if (!value) { setResults([]); setUnmatchedTokens([]); return; }
    const tokens = value.split(",").map((token) => token.trim()).filter(Boolean);
    const responses = await Promise.all(tokens.map(async (token) => ({ token, response: await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags?category=stack&search=${encodeURIComponent(token)}`) })));
    const tokenResults = await Promise.all(responses.map(async ({ token, response }) => ({ token, tags: response.ok ? await response.json() as StackTag[] : [] })));
    const unique = new Map<number, StackTag>();
    tokenResults.flatMap(({ tags }) => tags).forEach((tag) => unique.set(tag.id, tag));
    setResults([...unique.values()]);
    setUnmatchedTokens(tokenResults.filter(({ tags }) => tags.length === 0).map(({ token }) => token));
  };

  const addStackTag = async (tag: StackTag) => {
    await fetch(`/api/proxy/profiles/me/stack/${tag.id}`, { method: "POST" });
    setStackTags((current) => current.some((item) => item.id === tag.id) ? current : [...current, tag]);
    setSearch("");
    setResults([]);
    setUnmatchedTokens([]);
  };

  const removeStackTag = async (id: number) => {
    await fetch(`/api/proxy/profiles/me/stack/${id}`, { method: "DELETE" });
    setStackTags((current) => current.filter((tag) => tag.id !== id));
  };

  const addAllStackMatches = async () => {
    for (const tag of results) await addStackTag(tag);
  };

  const submitStack = async () => {
    const names = unmatchedTokens.length > 0 ? unmatchedTokens : search.split(",").map((token) => token.trim()).filter(Boolean);
    const submissions = await Promise.all(names.map((name) => proxyFetch<{ status?: string; name?: string }>(
      `tags?name=${encodeURIComponent(name)}&category=stack`, { method: "POST" },
    )));
    const pending = submissions.filter((result) => result.status === "pending").map((result) => result.name).join(", ");
    if (pending) setError(`Submitted for review: ${pending}.`);
    setSearch("");
    setResults([]);
    setUnmatchedTokens([]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const contentLinks: ContentLink[] = isProfileSettings ? [
        ...(githubUrl ? [{ label: "GitHub", url: githubUrl }] : []),
        ...(linkedinUrl ? [{ label: "LinkedIn", url: linkedinUrl }] : []),
        ...(portfolioUrl ? [{ label: "Portfolio", url: portfolioUrl }] : []),
      ] : [...(github?.url ? [{ label: "GitHub", url: github.url }] : []), ...(linkedin?.url ? [{ label: "LinkedIn", url: linkedin.url }] : []), ...(portfolio?.url ? [{ label: "Portfolio", url: portfolio.url }] : []), ...additionalLinks].slice(0, 13);
      await proxyFetch("profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ ...(isProfileSettings ? { display_name: displayName, bio, content_links: contentLinks, section_visibility: visibility } : { content_links: contentLinks }) }),
      });
      router.refresh();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <div className={styles.header}>
          <div><p className={styles.eyebrow}>Owner settings · {section}</p><h2 id="edit-profile-title">Edit {section} settings</h2></div>
          <button className={styles.close} onClick={onClose} aria-label="Close settings">×</button>
        </div>
        {canEditLinks ? <>
          {isProfileSettings && <><label className={styles.field}>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><p className={styles.help}>This name appears below your avatar on the profile card.</p><label className={styles.field}>Bio / About me<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="Tell people about yourself" /></label></>}
          <div className={styles.grid}>
            {isProfileSettings && <><label className={styles.field}>GitHub URL<input placeholder="https://github.com/..." value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} /></label><label className={styles.field}>LinkedIn URL<input placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} /></label><label className={styles.field}>Portfolio URL<input placeholder="https://your-site.com" value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} /></label></>}
          </div>
          {isProfileSettings ? <p className={styles.help}>Add zero to three redirects. These control the quick-link buttons in the identity card.</p> : <><div className={styles.linkList}>{additionalLinks.map((link, index) => <div className={styles.linkEditor} key={`${link.url}-${index}`}><span>{link.label}<small>{link.url}</small></span><button onClick={() => setAdditionalLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div>{additionalLinks.length < 10 && <div className={styles.grid}><label className={styles.field}>Link label<input placeholder="Blog, Discord, etc." value={newLinkLabel} onChange={(event) => setNewLinkLabel(event.target.value)} /></label><label className={styles.field}>Link URL<input placeholder="https://..." value={newLinkUrl} onChange={(event) => setNewLinkUrl(event.target.value)} /></label><button className={styles.addLink} onClick={() => { if (newLinkLabel && newLinkUrl) { setAdditionalLinks((current) => [...current, { label: newLinkLabel, url: newLinkUrl }]); setNewLinkLabel(""); setNewLinkUrl(""); } }}>Add link</button></div>}<p className={styles.help}>You can add up to 10 additional links shown in the Links section.</p></>}
        </> : <div className={styles.placeholder}>Settings for {section} are coming soon.</div>}
        {isProfileSettings && <>
          <div className={styles.field}>
            <span>Stack</span>
            <div className={styles.tagRow}>{stackTags.map((tag) => <span className={styles.tag} key={tag.id}>{tag.name}<button onClick={() => removeStackTag(tag.id)} aria-label={`Remove ${tag.name}`}>×</button></span>)}</div>
            <input placeholder="Search technologies, separated by commas" value={search} onChange={(event) => searchStack(event.target.value)} />
            {results.length > 0 && <div className={styles.results}>
              {search.includes(",") && <button onClick={addAllStackMatches}>Add all matching tags</button>}
              {results.map((tag) => <button key={tag.id} onClick={() => addStackTag(tag)}>{tag.name}</button>)}
            </div>}
            {unmatchedTokens.length > 0 && <button className={styles.submitNewButton} onClick={submitStack}>Submit unmatched tags for review</button>}
          </div>
          <div className={styles.visibility}><span>Visible sections</span>{(Object.keys(DEFAULT_VISIBILITY) as (keyof SectionVisibility)[]).map((key) => <label key={key}><input type="checkbox" checked={visibility[key]} onChange={(event) => setVisibility((current) => ({ ...current, [key]: event.target.checked }))} />{key}</label>)}</div>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}><button className={styles.cancel} onClick={onClose}>{canEditLinks ? "Cancel" : "Close"}</button>{canEditLinks && <button className={styles.save} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>}</div>
      </section>
    </div>,
    document.body,
  );
}