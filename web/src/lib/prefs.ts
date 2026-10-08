import { useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/analytics";

// small per-browser preferences persisted in localStorage

type Prefs = {
	theme: "light" | "dark" | "system";
	format: "m4a" | "mp3";
};

const DEFAULTS: Prefs = { theme: "system", format: "m4a" };
const listeners = new Set<() => void>();

function read<K extends keyof Prefs>(key: K): Prefs[K] {
	try {
		return (localStorage.getItem(key) as Prefs[K] | null) ?? DEFAULTS[key];
	} catch {
		return DEFAULTS[key];
	}
}

export function getPref<K extends keyof Prefs>(key: K): Prefs[K] {
	return read(key);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
	const changed = read(key) !== value;
	try {
		localStorage.setItem(key, value);
	} catch {}
	listeners.forEach((l) => l());
	if (changed) trackEvent("preference_changed", { preference: key, value });
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function usePref<K extends keyof Prefs>(key: K): [Prefs[K], (v: Prefs[K]) => void] {
	const value = useSyncExternalStore(subscribe, () => read(key));
	return [value, (v) => setPref(key, v)];
}
