"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Profile, RunResult } from "../contracts";
type Session = {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  run: RunResult | null;
  setRun: (r: RunResult | null, input?: Profile) => void;
  accessKey: string;
  setAccessKey: (s: string) => void;
};
const Context = createContext<Session | null>(null);
export function Providers({ children }: { children: ReactNode }) {
  const [profile, saveProfile] = useState<Profile | null>(null);
  const [run, saveRun] = useState<RunResult | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const currentProfile = useRef<Profile | null>(null);
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
