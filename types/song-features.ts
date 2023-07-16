export type SongFeatures = {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  key: string;
  liveness: number;
  loudness: number;
  modality: number;
  speechiness: number;
  tempo: number;
  time_signature: number;
  valence: number;
}

export const pitch = new Map();
pitch.set(0, "C");
pitch.set(1, "C#");
pitch.set(2, "D");
pitch.set(3, "D#");
pitch.set(4, "E");
pitch.set(5, "F");
pitch.set(6, "F#");
pitch.set(7, "G");
pitch.set(8, "G#");
pitch.set(9, "A");
pitch.set(10, "A#");
pitch.set(11, "B");