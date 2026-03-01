from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Generator, Mapping, Optional, Tuple, Union

import numpy as np

try:
    import librosa
except ImportError as exc:  # pragma: no cover - exercised via runtime usage
    raise ImportError(
        "librosa is required for haptics extraction. Install dependencies: "
        "pip install numpy scipy librosa"
    ) from exc


Array = np.ndarray
PathLike = Union[str, Path]


@dataclass(frozen=True)
class ExtractConfig:
    """Configurable DSP parameters with real-time friendly defaults."""

    sr: int = 22050
    n_fft: int = 1024
    hop_length: int = 256
    win_length: Optional[int] = None
    window: str = "hann"
    center: bool = True
    hpss_kernel_size: Tuple[int, int] = (31, 31)
    harmonic_power: float = 1.0
    percussive_power: float = 1.0

    # Band envelope follower (seconds)
    band_attack_s: float = 0.010
    band_release_s: float = 0.120

    # Adaptive normalization tracking
    norm_fast: float = 0.20
    norm_slow: float = 0.004
    norm_compression_k: float = 8.0

    # Hit extraction
    hit_attack_s: float = 0.005
    hit_release_s: float = 0.080
    hit_threshold: float = 0.58
    refractory_s: float = 0.090


BANDS_HZ: Mapping[str, Tuple[float, float]] = {
    "bass": (40.0, 250.0),
    "lowmid": (250.0, 800.0),
    "mid": (800.0, 2500.0),
    "treble": (2500.0, 8000.0),
}


def _coef_from_time(time_s: float, frame_rate_hz: float) -> float:
    time_s = max(time_s, 1e-5)
    frame_rate_hz = max(frame_rate_hz, 1e-6)
    return float(np.exp(-1.0 / (time_s * frame_rate_hz)))


def _envelope_follower(
    x: Array,
    *,
    frame_rate_hz: float,
    attack_s: float,
    release_s: float,
) -> Array:
    """One-pole attack/release envelope follower on a frame-rate signal."""

    x = np.asarray(x, dtype=np.float32)
    if x.size == 0:
        return x

    attack_coef = _coef_from_time(attack_s, frame_rate_hz)
    release_coef = _coef_from_time(release_s, frame_rate_hz)

    out = np.empty_like(x)
    y_prev = float(x[0])
    out[0] = y_prev

    for i in range(1, x.size):
        xi = float(x[i])
        coef = attack_coef if xi > y_prev else release_coef
        y_prev = coef * y_prev + (1.0 - coef) * xi
        out[i] = y_prev

    return out


def _adaptive_normalize(
    x: Array,
    *,
    fast: float,
    slow: float,
    compression_k: float,
) -> Array:
    """
    Lightweight adaptive normalization to [0, 1].

    - `hi` tracks recent peaks (fast rise, slow fall)
    - `lo` tracks floor (fast drop, slow rise)
    """

    x = np.asarray(x, dtype=np.float32)
    if x.size == 0:
        return x

    fast = float(np.clip(fast, 1e-4, 1.0))
    slow = float(np.clip(slow, 1e-6, fast))

    x_comp = np.log1p(max(0.0, compression_k) * np.maximum(x, 0.0))

    out = np.empty_like(x_comp)
    hi = max(float(x_comp[0]), 1e-6)
    lo = min(float(x_comp[0]), hi * 0.5)

    for i, xi in enumerate(x_comp):
        val = float(xi)

        hi_alpha = fast if val > hi else slow
        hi = hi + hi_alpha * (val - hi)

        lo_alpha = fast if val < lo else slow
        lo = lo + lo_alpha * (val - lo)

        span = max(hi - lo, 1e-6)
        out[i] = float(np.clip((val - lo) / span, 0.0, 1.0))

    return out


def _band_energy(mag: Array, freqs: Array, f_lo: float, f_hi: float) -> Array:
    idx = np.where((freqs >= f_lo) & (freqs < f_hi))[0]
    if idx.size == 0:
        return np.zeros(mag.shape[1], dtype=np.float32)
    band_power = np.sum(np.square(mag[idx, :], dtype=np.float32), axis=0)
    return np.sqrt(np.maximum(band_power, 0.0)).astype(np.float32)


def _detect_hits(
    percussive_mag: Array,
    *,
    frame_rate_hz: float,
    attack_s: float,
    release_s: float,
    threshold: float,
    refractory_s: float,
    norm_fast: float,
    norm_slow: float,
    norm_compression_k: float,
) -> Tuple[Array, Array]:
    # Flux from percussive energy is robust and cheap.
    p_energy = np.sum(percussive_mag, axis=0, dtype=np.float32)
    flux = np.maximum(0.0, np.diff(p_energy, prepend=p_energy[0])).astype(np.float32)

    flux_env = _envelope_follower(
        flux,
        frame_rate_hz=frame_rate_hz,
        attack_s=attack_s,
        release_s=release_s,
    )
    hit_strength = _adaptive_normalize(
        flux_env,
        fast=norm_fast,
        slow=norm_slow,
        compression_k=norm_compression_k,
    )

    refractory_frames = max(1, int(round(refractory_s * frame_rate_hz)))
    thr = float(np.clip(threshold, 0.0, 1.0))
    hit = np.zeros_like(hit_strength, dtype=np.float32)

    last_fire = -refractory_frames
    for i, score in enumerate(hit_strength):
        if score >= thr and (i - last_fire) >= refractory_frames:
            hit[i] = 1.0
            last_fire = i

    return hit, hit_strength


def _validate_shapes(result: Dict[str, Array]) -> Dict[str, Array]:
    n = result["timestamp_sec"].shape[0]
    for key, arr in result.items():
        if arr.shape != (n,):
            raise ValueError(f"Output array '{key}' has unexpected shape {arr.shape}; expected {(n,)}")
    return result


def extract_from_file(
    path: PathLike,
    *,
    config: Optional[ExtractConfig] = None,
    **overrides: object,
) -> Dict[str, Array]:
    """
    Extract haptics features from an audio file.

    Returns dict of frame-aligned arrays:
    - timestamp_sec
    - bass, lowmid, mid, treble (harmonic envelopes in [0, 1])
    - hit (binary percussive trigger in {0, 1})
    - hit_strength (continuous onset score in [0, 1])
    """

    cfg = config or ExtractConfig()
    if overrides:
        cfg = ExtractConfig(**{**cfg.__dict__, **overrides})

    y, sr = librosa.load(str(path), sr=cfg.sr, mono=True)
    if y.size == 0:
        empty = np.zeros(0, dtype=np.float32)
        return {
            "timestamp_sec": empty,
            "bass": empty,
            "lowmid": empty,
            "mid": empty,
            "treble": empty,
            "hit": empty,
            "hit_strength": empty,
        }

    S_complex = librosa.stft(
        y,
        n_fft=cfg.n_fft,
        hop_length=cfg.hop_length,
        win_length=cfg.win_length,
        window=cfg.window,
        center=cfg.center,
    )
    mag = np.abs(S_complex).astype(np.float32)

    harmonic_mag, percussive_mag = librosa.decompose.hpss(
        mag,
        kernel_size=cfg.hpss_kernel_size,
        power=2.0,
        mask=False,
    )
    harmonic_mag = np.power(np.maximum(harmonic_mag, 0.0), cfg.harmonic_power).astype(np.float32)
    percussive_mag = np.power(np.maximum(percussive_mag, 0.0), cfg.percussive_power).astype(np.float32)

    frame_rate_hz = sr / float(cfg.hop_length)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=cfg.n_fft).astype(np.float32)
    n_frames = harmonic_mag.shape[1]
    t_sec = (np.arange(n_frames, dtype=np.float32) * cfg.hop_length) / float(sr)

    out: Dict[str, Array] = {"timestamp_sec": t_sec}

    for key, (f_lo, f_hi) in BANDS_HZ.items():
        raw = _band_energy(harmonic_mag, freqs, f_lo, f_hi)
        env = _envelope_follower(
            raw,
            frame_rate_hz=frame_rate_hz,
            attack_s=cfg.band_attack_s,
            release_s=cfg.band_release_s,
        )
        out[key] = _adaptive_normalize(
            env,
            fast=cfg.norm_fast,
            slow=cfg.norm_slow,
            compression_k=cfg.norm_compression_k,
        )

    hit, hit_strength = _detect_hits(
        percussive_mag,
        frame_rate_hz=frame_rate_hz,
        attack_s=cfg.hit_attack_s,
        release_s=cfg.hit_release_s,
        threshold=cfg.hit_threshold,
        refractory_s=cfg.refractory_s,
        norm_fast=cfg.norm_fast,
        norm_slow=cfg.norm_slow,
        norm_compression_k=cfg.norm_compression_k,
    )
    out["hit"] = hit
    out["hit_strength"] = hit_strength

    return _validate_shapes(out)


def extract_from_mic(
    *,
    config: Optional[ExtractConfig] = None,
    blocksize: int = 1024,
    channels: int = 1,
    dtype: str = "float32",
    device: Optional[Union[int, str]] = None,
) -> Generator[Dict[str, float], None, None]:
    """
    Optional realtime helper.

    This yields lightweight frame dicts. It uses STFT + HPSS on each incoming block
    (small window over the block), then emits the most recent frame.
    """

    try:
        import sounddevice as sd
    except ImportError as exc:  # pragma: no cover - exercised via runtime usage
        raise ImportError(
            "sounddevice is required for extract_from_mic(). Install with: pip install sounddevice"
        ) from exc

    cfg = config or ExtractConfig()
    state_hi = {k: 1e-6 for k in BANDS_HZ}
    state_lo = {k: 0.0 for k in BANDS_HZ}
    frame_rate_hz = cfg.sr / float(cfg.hop_length)
    refractory_frames = max(1, int(round(cfg.refractory_s * frame_rate_hz)))
    frames_since_hit = refractory_frames

    def normalize_sample(key: str, value: float) -> float:
        val = float(np.log1p(max(0.0, cfg.norm_compression_k) * max(0.0, value)))
        hi = state_hi[key]
        lo = state_lo[key]

        hi_alpha = cfg.norm_fast if val > hi else cfg.norm_slow
        hi = hi + hi_alpha * (val - hi)

        lo_alpha = cfg.norm_fast if val < lo else cfg.norm_slow
        lo = lo + lo_alpha * (val - lo)

        state_hi[key] = hi
        state_lo[key] = lo
        return float(np.clip((val - lo) / max(hi - lo, 1e-6), 0.0, 1.0))

    with sd.InputStream(
        samplerate=cfg.sr,
        channels=channels,
        blocksize=blocksize,
        dtype=dtype,
        device=device,
    ) as stream:
        while True:
            audio, _ = stream.read(blocksize)
            mono = audio[:, 0] if audio.ndim > 1 else audio

            S = librosa.stft(
                mono,
                n_fft=cfg.n_fft,
                hop_length=cfg.hop_length,
                win_length=cfg.win_length,
                window=cfg.window,
                center=False,
            )
            if S.size == 0:
                continue

            mag = np.abs(S).astype(np.float32)
            H, P = librosa.decompose.hpss(mag, kernel_size=cfg.hpss_kernel_size, power=2.0, mask=False)
            H = np.power(np.maximum(H, 0.0), cfg.harmonic_power).astype(np.float32)
            P = np.power(np.maximum(P, 0.0), cfg.percussive_power).astype(np.float32)
            freqs = librosa.fft_frequencies(sr=cfg.sr, n_fft=cfg.n_fft).astype(np.float32)

            frame_idx = H.shape[1] - 1
            frame: Dict[str, float] = {}
            for key, (f_lo, f_hi) in BANDS_HZ.items():
                band = _band_energy(H, freqs, f_lo, f_hi)
                frame[key] = normalize_sample(key, float(band[frame_idx]))

            p_energy = np.sum(P, axis=0, dtype=np.float32)
            flux = max(0.0, float(p_energy[-1] - p_energy[-2])) if p_energy.size >= 2 else 0.0
            flux_norm = float(np.clip(np.log1p(cfg.norm_compression_k * flux) / np.log1p(cfg.norm_compression_k), 0.0, 1.0))

            hit = 0.0
            if flux_norm >= cfg.hit_threshold and frames_since_hit >= refractory_frames:
                hit = 1.0
                frames_since_hit = 0
            else:
                frames_since_hit += 1

            frame["hit"] = hit
            frame["hit_strength"] = flux_norm
            frame["timestamp_sec"] = float(getattr(stream, "time", 0.0))
            yield frame
