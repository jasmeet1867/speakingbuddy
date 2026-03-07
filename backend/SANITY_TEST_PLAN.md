# Sanity Test Plan (Preprocessing Isolation)

This plan isolates whether preprocessing is causing low real-user scores.

## Prereqs

- Start from `backend/` with venv activated.
- Frontend sanity mode remains enabled in `topic.js` (`SANITY_USE_REFERENCE_AUDIO = true`).

## Test Data Setup (Raw LOD References)

1. Download raw LOD audio as WAV without trimming or normalization.

```bash
python -m scripts.download_lod_raw_audio --csv data/words.csv --out-dir reference_audio_lod_raw
```

2. Import CSV using the raw audio dir and recompute features against that dir.

```bash
python -m scripts.import_csv --csv data/words.csv --audio-dir reference_audio_lod_raw --clean
python -m scripts.precompute_features --audio-dir reference_audio_lod_raw
```

## Experiment A: Reference vs Itself (Raw References)

Goal: verify score stays near-perfect when both sides are effectively same source.

1. Set `AUDIO_DIR` in `backend/.env`:

```env
AUDIO_DIR=./reference_audio_lod_raw
```

2. Restart server.
3. In browser, use URL parameter `?sanity=ref` and press Evaluate across many words.
4. Record average/min score.

Expected: mostly very high scores. If not, scoring pipeline has deeper issues.

## Experiment B: User Speech (Word + Plural) with Full Upload Preprocessing

Goal: measure effect when upload preprocessing may split to first segment.

1. Speak both segments (word + plural) when present.
3. Record scores.

## Experiment C: User Speech (Word + Plural) with Convert-Only Upload

Goal: test whether upload-side preprocessing is causing mismatch.

1. Baseline-C already uses conversion-only upload analysis by default.
2. Restart server.
3. Speak both segments (word + plural) and score the same subset of words as Experiment B.

Interpretation:
- If C >> B, upload preprocessing is a major cause.
- If C ~= B (both low), mismatch likely in feature design/scoring assumptions.
- If A is high and B/C are low, user-capture domain mismatch is likely.

## Result Log Template

Fill this and share back for analysis.

```text
Experiment A (raw ref vs itself)
- Words tested:
- Avg score:
- Min/Max:
- Notes:

Experiment B (user word+plural, preprocess=full)
- Words tested:
- Avg score:
- Min/Max:
- Notes:

Experiment C (user word+plural, preprocess=convert-only)
- Words tested:
- Avg score:
- Min/Max:
- Notes:

Logs (paste a few samples):
- Frontend [Evaluate] lines:
- Backend Pronunciation request lines:
```
