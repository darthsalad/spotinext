from typing import Literal

from pydantic import BaseModel, Field


class TrackMeta(BaseModel):
    """Spotify track metadata sent by the browser; used for matching and tagging."""

    spotifyId: str | None = None
    title: str = Field(min_length=1, max_length=300)
    artists: list[str] = Field(min_length=1, max_length=20)
    album: str | None = None
    albumArtists: list[str] = []
    releaseDate: str | None = None
    trackNumber: int | None = None
    totalTracks: int | None = None
    discNumber: int | None = None
    durationMs: int | None = None
    isrc: str | None = None
    explicit: bool = False
    coverUrl: str | None = None
    genres: list[str] = []
    spotifyUrl: str | None = None


class ResolveRequest(BaseModel):
    track: TrackMeta


class ResolveResponse(BaseModel):
    videoId: str
    title: str
    score: float
    source: Literal["cache", "ytmusic", "isrc", "youtube"]


class TrackRequest(BaseModel):
    track: TrackMeta
    # pass the videoId from /resolve to skip the search; otherwise it's resolved here
    videoId: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{11}$")
    format: Literal["m4a", "mp3"] = "m4a"
