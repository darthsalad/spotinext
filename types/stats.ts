export type TopArtists = {
  name: string;
  uri: string;
  id: string;
  genres: string[];
  external_urls: {
    spotify: string;
  };
  images: string[];
}

export type TopTracks = {
  name: string;
  uri: string;
  id: string;
  external_urls: {
    spotify: string;
  };
  album: {
    name: string;
    uri: string;
    artists: {
      name: string;
      uri: string;
    }[];
    images: string[];
  };
  artists: {
    name: string;
    uri: string;
    external_urls: {
      spotify: string;
    };
  }[];

}