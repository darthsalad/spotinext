import { useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { fetchTrack, saveBlob, type TrackMeta } from "@/lib/downloader";
import { getPref } from "@/lib/prefs";

export type TrackDownloadState =
	| { phase: "idle" }
	| { phase: "preparing" }
	| { phase: "downloading"; progress: number }
	| { phase: "done" }
	| { phase: "error"; message: string };

export function useTrackDownload() {
	const [state, setState] = useState<TrackDownloadState>({ phase: "idle" });
	const busy = useRef(false);
	const { toast } = useToast();

	const download = async (meta: TrackMeta, videoId?: string) => {
		if (busy.current) return;
		busy.current = true;
		setState({ phase: "preparing" });
		try {
			const { blob, filename } = await fetchTrack(meta, {
				format: getPref("format"),
				videoId,
				onProgress: (progress) => setState({ phase: "downloading", progress }),
			});
			saveBlob(blob, filename);
			setState({ phase: "done" });
			setTimeout(() => setState({ phase: "idle" }), 2500);
		} catch (e) {
			const message = (e as Error).message;
			setState({ phase: "error", message });
			toast({ variant: "destructive", title: `Couldn't download "${meta.title}"`, description: message });
		} finally {
			busy.current = false;
		}
	};

	return { state, download };
}
