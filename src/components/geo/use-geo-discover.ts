"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MemberProfile } from "@/lib/chat";
import { listMembersByIds } from "@/lib/social";
import {
  collectPages, orderForDiscover,
  type CandidatePage, type GeoScope, type GeoSort, type PublicCandidate,
} from "@/lib/geo/discovery";
import type { GeoReason } from "@/lib/geo/discovery-server";

export type GeoStatus = "idle" | "loading" | "ready" | "error" | "unavailable" | "limited";

async function fetchPage(scope: GeoScope, includeUnlocated: boolean, offset: number): Promise<CandidatePage & { reason?: GeoReason }> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  const qs = new URLSearchParams({ scope, offset: String(offset) });
  if (includeUnlocated) qs.set("includeUnlocated", "1");
  const res = await fetch(`/api/discover/geo?${qs}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 429) throw Object.assign(new Error("limited"), { code: "limited" });
  if (res.status === 503) throw Object.assign(new Error("unavailable"), { code: "unavailable" });
  if (!res.ok) throw new Error("error");
  return res.json();
}

/**
 * Filtre géographique du Discover. Sans portée (« none »), RIEN n'est appelé : le Discover existant reste
 * strictement inchangé. Avec une portée : identifiants autorisés par le serveur → profils chargés par
 * identifiant → classement de compatibilité EXISTANT (`rank`, inchangé) → tri géographique secondaire.
 */
export function useGeoDiscover({
  meId, gender, rank,
}: {
  meId: string;
  gender: string | undefined;
  /** filterAndRankByReciprocalMatch du demandeur : garde les scores ≥ 60 et trie par compatibilité. */
  rank: (members: MemberProfile[]) => MemberProfile[];
}) {
  const [scope, setScope] = useState<GeoScope>("none");
  const [sort, setSort] = useState<GeoSort>("compat");
  const [includeUnlocated, setIncludeUnlocated] = useState(false);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [reason, setReason] = useState<GeoReason | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loaded, setLoaded] = useState<MemberProfile[]>([]);
  const [meta, setMeta] = useState<Map<string, PublicCandidate>>(new Map());
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    if (scope === "none" || !meId) {
      setStatus("idle"); setReason(null); setTruncated(false); setLoaded([]); setMeta(new Map());
      return;
    }
    setStatus("loading");
    (async () => {
      try {
        let firstReason: GeoReason | null = null;
        const { candidates, truncated: cut } = await collectPages(async (offset) => {
          const page = await fetchPage(scope, includeUnlocated, offset);
          if (page.reason && !firstReason) firstReason = page.reason;
          return page;
        });
        if (id !== reqId.current) return;
        const m = new Map(candidates.map((c) => [c.userId, c]));
        const members = await listMembersByIds(meId, candidates.map((c) => c.userId));
        if (id !== reqId.current) return;
        const opposite = gender === "homme" ? "femme" : gender === "femme" ? "homme" : null;
        setLoaded(opposite ? members.filter((x) => x.gender === opposite) : members);
        setMeta(m); setReason(firstReason); setTruncated(cut); setStatus("ready");
      } catch (e) {
        if (id !== reqId.current) return;
        const code = (e as { code?: string }).code;
        setStatus(code === "limited" ? "limited" : code === "unavailable" ? "unavailable" : "error");
      }
    })();
    return () => { reqId.current++; };
  }, [scope, includeUnlocated, meId, gender]);

  // Classement de compatibilité EXISTANT sur les profils chargés, puis tri géographique secondaire.
  const ordered = useMemo(() => orderForDiscover(rank(loaded), meta, sort), [loaded, meta, sort, rank]);

  return {
    active: scope !== "none",
    scope, setScope, sort, setSort, includeUnlocated, setIncludeUnlocated,
    status, reason, truncated, meta,
    located: ordered.located, unlocated: ordered.unlocated,
  };
}
