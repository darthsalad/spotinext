import { useSyncExternalStore } from "react";

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
	try {
		localStorage.setItem(key, value);
	} catch {}
	listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function usePref<K extends keyof Prefs>(key: K): [Prefs[K], (v: Prefs[K]) => void] {
	const value = useSyncExternalStore(subscribe, () => read(key));
	return [value, (v) => setPref(key, v)];
}
