export type ProfileData = {
	country: string;
	display_name: string;
	email: string;
	spotify_profile: string;
	followers: {
		href: string | null;
		total: number;
	};
	id: string;
	images: ProfileImages[];
	type: string;
	uri: string;
};

export type ProfileImages = {
	height: number | null;
	url: string;
	width: number | null;
}
