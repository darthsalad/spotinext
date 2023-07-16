import { ProfileImages } from "./spotify-profile";

export type SpotifyPlaying = {
  is_playing: boolean;
  context: {
    external_urls: {
      spotify: string;
    };
    type: string;
    uri: string;
  }
  item: {
    album: {
      album_type: string;
      external_urls: {
        spotify: string;
      };
      uri: string;
      images: ProfileImages[];
      name: string;
      type: string;
    };
    artists: Artist[];
    duration_ms: number;
    external_urls: {
      spotify: string;
    };
    id: string;
    explicit: boolean;
    name: string;
    type: string;
    uri: string;
  };
  progress_ms: number;
};
  
type Artist = {
  external_urls: {
    spotify: string;
  };
  name: string;
  type: string;
  uri: string;
}