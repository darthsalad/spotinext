import { useSyncExternalStore } from "react";
import { isLoggedIn, subscribeAuth } from "@/lib/auth";

export function useLoggedIn() {
	return useSyncExternalStore(subscribeAuth, isLoggedIn);
}
