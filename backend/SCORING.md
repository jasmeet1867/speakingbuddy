# Pronunciation Scoring Engine — Deep Dive

This document explains how SpeakingBuddy's pronunciation scoring works under the hood, what every tunable parameter does, and how to adjust the scoring to be stricter or more lenient.

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Stage 1: Audio Preprocessing](#stage-1-audio-preprocessing)
3. [Stage 2: Praat Feature Extraction](#stage-2-praat-feature-extraction)
4. [Stage 3: Feature Comparison & Scoring](#stage-3-feature-comparison--scoring)
5. [Stage 4: Feedback Generation](#stage-4-feedback-generation)
6. [Why Scores May Be Low](#why-scores-may-be-low)
7. [Complete Tuning Reference](#complete-tuning-reference)
8. [Recommended Tuning for Beginners](#recommended-tuning-for-beginners)

---

## Pipeline Overview

When a user clicks **Evaluate**, four modules run in sequence:

```
User WebM blob (from browser microphone)
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 1. AUDIO PROCESSOR  (audio_processor.py)            │
│    WebM → WAV (mono, 22050Hz)                       │
│    Normalize loudness to -20 dBFS                   │
│    Trim silence from both ends                      │
│    Isolate first word (discard extra segments)       │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ 2. PRAAT ANALYZER  (praat_analyzer.py)              │
│    Extract from user WAV:                           │
│    • Pitch (F0): contour + statistics               │
│    • Formants (F1, F2, F3): frame-by-frame arrays   │
│    • Intensity: dB envelope + statistics             │
│    • Duration: total seconds + voiced fraction       │
│    • Voice quality: jitter + shimmer                 │
│                                                     │
│    Same features are pre-computed for reference      │
│    audio and stored as JSON in the database          │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ 3. FEATURE COMPARATOR  (feature_comparator.py)      │
│    Compare user features vs reference features:     │
│                                                     │
│    Per feature → sub-score 0-100                    │
│    Weighted sum → overall score 0-100               │
│                                                     │
│    Uses two math tools:                             │
│    • DTW for time-series (pitch, formants, intens.) │
│    • Gaussian similarity for scalars                │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ 4. FEEDBACK GENERATOR  (feedback_generator.py)      │
│    Threshold checks on each sub-score               │
│    → Human-readable tips like:                      │
│      "Your vowel quality differs — focus on:        │
│       mouth openness, tongue position"              │
└─────────────────────────────────────────────────────┘
```

---

## Stage 1: Audio Preprocessing

**File:** `backend/app/services/audio_processor.py`

Before any analysis, the raw browser recording is cleaned up:

| Step | What happens | Why |
|------|-------------|-----|
| Convert to WAV | WebM → mono WAV at 22050Hz | Praat requires uncompressed audio; mono prevents channel confusion |
| Normalize loudness | Adjust gain to -20 dBFS (RMS) | Makes comparison fair regardless of mic volume |
| Trim silence | Remove leading/trailing silence below -40 dBFS | Prevents silence from skewing duration/intensity |
| Split first word | Keep only the first non-silent segment | Handles cases where user says extra words |

### Parameters

| Parameter | Value | Location | Effect |
|-----------|-------|----------|--------|
| `SAMPLE_RATE` | 22050 Hz | Line 16 | Standard for speech analysis; matches reference audio |
| `TARGET_DBFS` | -20.0 | Line 19 | Loudness normalization target; both user & reference are normalized to this |
| `SILENCE_THRESH_DB` | -40 dBFS | Line 17 | Audio below this is considered silence; too aggressive = clips quiet speech |
| `MIN_SILENCE_LEN_MS` | 200 ms | Line 18 | Minimum gap length to count as "silence"; prevents word-internal pauses from splitting |

---

## Stage 2: Praat Feature Extraction

**File:** `backend/app/services/praat_analyzer.py`

Uses the **parselmouth** Python wrapper for Praat — the gold standard tool in phonetics research. Extracts 5 feature groups:

### 2.1 Pitch (F0)

```python
pitch_obj = call(snd, "To Pitch", 0.0, 75, 600)
```

- **What it is:** The fundamental frequency of the voice — how "high" or "low" you sound
- **Output:** Mean, std, min, max, and the full time-series of F0 values (Hz)
- **Pitch floor (75 Hz):** Lowest pitch to detect — covers deep male voices
- **Pitch ceiling (600 Hz):** Highest pitch to detect — covers female/child voices
- **Only voiced frames counted:** Unvoiced consonants (s, t, k) naturally have no pitch

### 2.2 Formants (F1, F2, F3)

```python
formant_obj = call(snd, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
```

- **What they are:** Resonant frequencies created by your mouth shape
  - **F1 (200-900 Hz):** Correlates with mouth openness (open = high F1)
  - **F2 (800-2500 Hz):** Correlates with tongue front/back position (front = high F2)
  - **F3 (1500-3500 Hz):** Correlates with lip rounding (rounded = lower F3)
- **Output:** Frame-by-frame arrays + means/stds for each formant
- **Max formant frequency (5500 Hz):** Upper search bound for formant detection
- **Number of formants (5):** Praat searches for 5 formants below 5500 Hz
- **Window length (0.025s = 25ms):** Standard analysis window for speech

**Why formants matter most:** Two different vowels (e.g., "ee" vs "ah") have completely different F1/F2 patterns. If you say the wrong vowel, formants diverge massively. This is why formants have the highest weight (35%).

### 2.3 Intensity

```python
intensity_obj = call(snd, "To Intensity", 75, 0.0)
```

- **What it is:** The energy/loudness envelope over time (in dB)
- **Output:** Frame-by-frame dB values + mean, std, min, max
- **Used for:** Stress pattern comparison — which part of the word is emphasized

### 2.4 Duration

- **Total seconds:** Simple length of the processed audio
- **Voiced fraction:** What percentage of frames are voiced (have a detectable pitch)
- **Used for:** Speed matching — did you say the word too fast or too slow?

### 2.5 Voice Quality (Jitter & Shimmer)

```python
point_process = call(snd, "To PointProcess (periodic, cc)", 75, 600)
jitter = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
shimmer = call([snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
```

- **Jitter:** Cycle-to-cycle variation in pitch period (pitch instability)
- **Shimmer:** Cycle-to-cycle variation in amplitude (volume instability)
- **Normal speech:** Jitter ≈ 0.5-1.5%, Shimmer ≈ 2-5%
- **Higher values:** Suggest breathy, shaky, or strained voice
- **Used for:** Detecting nervousness, vocal strain, or non-native pronunciation tension

---

## Stage 3: Feature Comparison & Scoring

**File:** `backend/app/services/feature_comparator.py`

### The core math: Gaussian similarity

Every comparison ultimately uses this function:

```python
def _gaussian_similarity(diff, sigma):
    return 100 * exp(-0.5 * (diff / sigma)²)
```

This maps **any difference** to a **0–100 score**:

| diff / sigma ratio | Score | Meaning |
|-------------------|-------|---------|
| 0.0 | **100** | Perfect match |
| 0.5 | **88** | Very close |
| 1.0 | **61** | Noticeable difference |
| 1.5 | **32** | Significant difference |
| 2.0 | **14** | Very different |
| 3.0 | **1** | Completely different |

**Sigma is the "strictness knob."** A smaller sigma means the score drops faster as the difference grows. Larger sigma = more forgiving.

### The core math: DTW (Dynamic Time Warping)

For time-series data (pitch contour, formant trajectories, intensity envelope), raw values can't be compared frame-by-frame because people speak at different speeds. DTW aligns two sequences by warping time:

```
User:  ──╲──────╱──        (said "Hond" slowly)
          ╲    ╱
Ref:   ────╲╱────          (native said "Hond" quickly)
           DTW aligns them
```

The DTW distance is the average aligned-frame difference, which is then fed into the Gaussian similarity function.

### How each feature is scored

#### Pitch score (weight: 20%)

```
pitch_score = 0.5 × contour_score + 0.3 × mean_score + 0.2 × range_score
```

| Component | What's compared | Method | Sigma |
|-----------|----------------|--------|-------|
| Contour | Full F0 time-series | DTW → Gaussian | 50 Hz |
| Mean | Average F0 value | Gaussian | 30 Hz |
| Range | (Max - Min) F0 | Gaussian | 40 Hz |

The **contour** (melody shape) dominates. Mean penalizes baseline voice differences (male vs female). Range checks if you have the same pitch variation.

#### Formant score (weight: 35%)

```
formant_score = 0.4 × F1_score + 0.4 × F2_score + 0.2 × F3_score
```

| Component | What's compared | Method | Sigma |
|-----------|----------------|--------|-------|
| F1 | Full F1 time-series | DTW → Gaussian | 100 Hz |
| F2 | Full F2 time-series | DTW → Gaussian | 100 Hz |
| F3 | Full F3 time-series | DTW → Gaussian | 100 Hz |

F1 and F2 are weighted equally (0.4 each) because they define which vowel you're saying. F3 (lip rounding) gets half weight.

**This is the hardest feature to score well on.** Formant values span 200–3000 Hz, but sigma is only 100 Hz on DTW distances. Non-native speakers routinely differ by 200–400 Hz on F2 alone, which crushes this score.

#### Intensity score (weight: 15%)

```
intensity_score = 0.6 × contour_score + 0.4 × mean_score
```

| Component | What's compared | Method | Sigma |
|-----------|----------------|--------|-------|
| Contour | dB time-series | DTW → Gaussian | 10 dB |
| Mean | Average dB | Gaussian | 5 dB |

**The mean comparison (sigma = 5 dB) is problematic.** Microphone distance, room acoustics, and hardware gain differences cause dB offsets that have nothing to do with pronunciation. A 6 dB difference (barely noticeable) drops the mean_score to ~50.

#### Duration score (weight: 15%)

```
duration_score = 0.6 × time_ratio_score + 0.4 × voiced_fraction_score
```

| Component | What's compared | Method | Sigma |
|-----------|----------------|--------|-------|
| Time ratio | user_seconds / ref_seconds | Gaussian on |1 - ratio| | 0.3 |
| Voiced fraction | % voiced frames | Gaussian on difference | 0.2 |

Relatively lenient — you can be 30% slower/faster and still score 61.

#### Voice quality score (weight: 15%)

```
vq_score = 0.5 × jitter_score + 0.5 × shimmer_score
```

| Component | What's compared | Method | Sigma |
|-----------|----------------|--------|-------|
| Jitter | Absolute difference | Gaussian | 0.01 |
| Shimmer | Absolute difference | Gaussian | 0.05 |

### Overall score

```
overall = 0.35 × formants + 0.20 × pitch + 0.15 × intensity
         + 0.15 × duration + 0.15 × voice_quality
```

---

## Stage 4: Feedback Generation

**File:** `backend/app/services/feedback_generator.py`

After scoring, the system checks each sub-score against thresholds and generates specific tips:

### Trigger thresholds

| Feature | Threshold | Triggers feedback if below |
|---------|-----------|--------------------------|
| Pitch | < 60 | Checks mean difference direction + contour match |
| Formants | < 60 | Identifies which formants (F1/F2/F3) are weak |
| Intensity | < 60 | Checks if too loud or too soft |
| Duration | < 60 | Checks speed ratio |
| Voice quality | < 50 | Checks jitter and shimmer separately |

### Example feedback messages

| Condition | Message |
|-----------|---------|
| Pitch too low | "Your pitch is too low by about 45 Hz. Try speaking slightly higher." |
| Bad pitch contour | "The pitch contour (melody) of your speech differs from the reference." |
| F1 too low | "Try opening your mouth a bit more." |
| F2 too low | "Move your tongue slightly forward — the vowel should be more 'front'." |
| Speaking too softly | "You're speaking too softly. Try to project your voice more." |
| Speaking too fast | "You're speaking too fast. Try to slow down a bit." |
| Unstable voice | "Your voice sounds somewhat unstable. Try to maintain a steady, relaxed tone." |

### Overall score labels

| Score range | Label |
|-------------|-------|
| ≥ 85 | "Excellent pronunciation! Very close to native." |
| ≥ 70 | "Good pronunciation with minor differences." |
| ≥ 55 | "Fair attempt — some aspects need work." |
| ≥ 40 | "Your pronunciation needs improvement in several areas." |
| < 40 | "Keep practising! Focus on the suggestions below." |

---

## Why Scores May Be Low

If a non-Luxembourgish speaker consistently scores 20–50, it's likely due to three factors:

### 1. Formants are strict and heavily weighted (35%)

Formant values encode vowel quality — the resonant frequencies created by your mouth shape. Luxembourgish has vowels that don't exist in English (like "ë" in Schwëster, "éi" in Béier). A non-native speaker's F1/F2 values will be systematically different.

With sigma = 100 Hz and DTW distances that can easily be 200–400 Hz, the formant score for a non-native speaker might be 10–30. Since formants carry 35% of the weight, this alone drags the overall score down by 25+ points.

### 2. Intensity mean comparison penalizes mic differences

The intensity mean sigma of 5 dB is extremely tight. Microphone distance, room acoustics, and hardware gain cause dB offsets unrelated to pronunciation. Even 6 dB louder/softer drops the intensity mean_score to ~50.

### 3. Pitch mean penalizes voice differences

If your voice's fundamental frequency differs from the reference speaker's by 40+ Hz (common between male and female speakers, or even between same-gender speakers), the pitch mean score drops significantly.

---

## Complete Tuning Reference

### A. Feature weights

**File:** `feature_comparator.py`, lines 14–20

```python
WEIGHTS = {
    "formants": 0.35,
    "pitch": 0.20,
    "intensity": 0.15,
    "duration": 0.15,
    "voice_quality": 0.15,
}
```

Must sum to 1.0.

### B. All sigma values

| Feature | Component | Sigma | File location | More lenient suggestion |
|---------|-----------|-------|---------------|------------------------|
| Pitch | Contour (DTW) | 50 | `_compare_pitch`, line ~143 | 80–100 |
| Pitch | Mean | 30 | `_compare_pitch`, line ~146 | 50–60 |
| Pitch | Range | 40 | `_compare_pitch`, line ~150 | 40 (fine) |
| Formants | F1/F2/F3 (DTW) | 100 | `_compare_formants`, line ~163 | 200–300 |
| Intensity | Contour (DTW) | 10 | `_compare_intensity`, line ~186 | 15–20 |
| Intensity | Mean | 5 | `_compare_intensity`, line ~190 | 10–15 |
| Duration | Time ratio | 0.3 | `_compare_duration`, line ~208 | 0.3 (fine) |
| Duration | Voiced fraction | 0.2 | `_compare_duration`, line ~218 | 0.2 (fine) |
| Voice quality | Jitter | 0.01 | `_compare_voice_quality`, line ~231 | 0.02–0.03 |
| Voice quality | Shimmer | 0.05 | `_compare_voice_quality`, line ~232 | 0.08–0.10 |

### C. Sub-feature weights

| Feature | Formula | Location |
|---------|---------|----------|
| Pitch | `0.5 × contour + 0.3 × mean + 0.2 × range` | `_compare_pitch` |
| Formants | `0.4 × F1 + 0.4 × F2 + 0.2 × F3` | `_compare_formants` |
| Intensity | `0.6 × contour + 0.4 × mean` | `_compare_intensity` |
| Duration | `0.6 × time_ratio + 0.4 × voiced_fraction` | `_compare_duration` |
| Voice quality | `0.5 × jitter + 0.5 × shimmer` | `_compare_voice_quality` |

### D. Praat extraction parameters

| Parameter | Value | Location | Purpose |
|-----------|-------|----------|---------|
| Pitch floor | 75 Hz | `_extract_pitch` | Lowest detectable F0 |
| Pitch ceiling | 600 Hz | `_extract_pitch` | Highest detectable F0 |
| Formant max freq | 5500 Hz | `_extract_formants` | Upper bound for formant search |
| Formant count | 5 | `_extract_formants` | Number of formants to detect |
| Formant window | 0.025s | `_extract_formants` | Analysis window length |
| Intensity min pitch | 75 Hz | `_extract_intensity` | Pitch floor for intensity calc |

### E. Audio preprocessing parameters

| Parameter | Value | Location | Purpose |
|-----------|-------|----------|---------|
| Sample rate | 22050 Hz | `audio_processor.py` | Target sample rate |
| Target loudness | -20 dBFS | `audio_processor.py` | RMS normalization target |
| Silence threshold | -40 dBFS | `audio_processor.py` | Below = silence |
| Min silence length | 200 ms | `audio_processor.py` | Minimum gap to count as silence |

### F. Feedback thresholds

| Feature | Threshold | Location |
|---------|-----------|----------|
| Pitch | < 60 | `feedback_generator.py` |
| Formants | < 60 | `feedback_generator.py` |
| Intensity | < 60 | `feedback_generator.py` |
| Duration | < 60 | `feedback_generator.py` |
| Voice quality | < 50 | `feedback_generator.py` |

---

## Recommended Tuning for Beginners

If non-native speakers consistently score 20–50 and you want more encouraging results, here are the recommended changes ranked by impact:

| Priority | Change | Current → New | Expected impact |
|----------|--------|---------------|-----------------|
| 1 | Formant DTW sigma | 100 → 200 | +15–25 points on formant score |
| 2 | Formant weight | 0.35 → 0.25 | Reduces impact of hardest feature |
| 3 | Intensity mean sigma | 5 → 12 | Stops penalizing mic/distance differences |
| 4 | Pitch mean sigma | 30 → 50 | Stops penalizing male/female voice differences |
| 5 | Duration weight | 0.15 → 0.25 | Rewards speed matching (easy to control) |
| 6 | Jitter sigma | 0.01 → 0.02 | More forgiving on voice stability |
| 7 | Shimmer sigma | 0.05 → 0.08 | More forgiving on volume stability |

**Combined effect:** A non-native speaker would likely move from 20–50 up to 40–70, which feels more motivating while still leaving room to improve. A native speaker (or reference-vs-self test) would still score 90+.
