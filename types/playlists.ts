export type Playlist = {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
  owner: {
    display_name: string;
  };
};

export type PlaylistTrack = {
  id: string;
  name: string;
  artists: {
    name: string;
  }[];
  external_urls: {
    spotify: string;
  };
};
