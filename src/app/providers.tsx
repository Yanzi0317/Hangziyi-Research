"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Profile, RunResult } from "../contracts";
import type { BetaContext } from "../beta/contracts";
export type ConsentState =
  | { status: "undecided" }
  | { status: "declined"; decidedAt: string }
  | { status: "accepted"; context: BetaContext };
type Session = {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  run: RunResult | null;
  setRun: (r: RunResult | null, input?: Profile) => void;
  accessKey: string;
  setAccessKey: (s: string) => void;
  consent: ConsentState;
  setConsent: (c: ConsentState) => void;
  preferredVersion: string | null;
  setPreferredVersion: (v: string | null) => void;
  feedbackDone: Set<string>;
  markFeedbackDone: (recordId: string) => void;
  hydrated: boolean;
};
const Context = createContext<Session | null>(null);
const KEY = "beta-consent-v1";
// Consent, the anonymous participant id and the invite settings survive a page
// refresh within the same tab (sessionStorage) so a tester does not have to
// re-consent. The profile and results stay in memory only.
function load(): {
  consent: ConsentState;
  accessKey: string;
  preferredVersion: string | null;
} {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    consent: { status: "undecided" },
    accessKey: "",
    preferredVersion: null,
  };
}
export function Providers({ children }: { children: ReactNode }) {
  const [profile, saveProfile] = useState<Profile | null>(null);
  const [run, saveRun] = useState<RunResult | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [consent, setConsent] = useState<ConsentState>({ status: "undecided" });
  const [preferredVersion, setPreferredVersion] = useState<string | null>(null);
  const [feedbackDone, setFeedbackDone] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const currentProfile = useRef<Profile | null>(null);
  useEffect(() => {
    const saved = load();
    setConsent(saved.consent);
    setAccessKey(saved.accessKey);
    setPreferredVersion(saved.preferredVersion);
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ consent, accessKey, preferredVersion }),
      );
    } catch {}
  }, [hydrated, consent, accessKey, preferredVersion]);
  return (
    <Context.Provider
      value={{
        profile,
        setProfile: (p) => {
          currentProfile.current = p;
          saveProfile(p);
          saveRun(null);
        },
        run,
        setRun: (r, input) => {
          if (
            r &&
            JSON.stringify(input) !== JSON.stringify(currentProfile.current)
          )
            return;
          saveRun(r);
        },
        accessKey,
        setAccessKey,
        consent,
        setConsent,
        preferredVersion,
        setPreferredVersion,
        feedbackDone,
        markFeedbackDone: (id) =>
          setFeedbackDone((prev) => new Set(prev).add(id)),
        hydrated,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const state = useContext(Context);
  if (!state) throw new Error("缺少会话 Provider");
  return state;
}
