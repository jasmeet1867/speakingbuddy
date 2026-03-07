# Sanity Test Results

Date:
Branch:
Commit:

## Experiment A (raw reference vs itself)

- Words tested: 5 (animals subset in rerun)
- Avg score: ~96 (reported range 93-100)
- Min score: 93
- Max score: 100
- Observations:
	- A1 (`UPLOAD_PREPROCESS_MODE=full`) produced 0 scores on raw LOD reference-vs-reference.
	- A2 (`UPLOAD_PREPROCESS_MODE=convert-only`) recovered to high scores (93-100).
	- This strongly indicates preprocessing asymmetry as the primary issue for raw references.


## Experiment B (user says word+plural, preprocess=full)

- Words tested: 5 (animals)
- Avg score: 0.49 (10 attempts logged)
- Min score: 0.0
- Max score: 4.0
- Observations:
	- Scores were near-zero for almost all attempts.
	- This reproduces the severe mismatch when upload preprocessing is `full`.

logs: [INIT] page loaded at 2026-03-06T23:49:18.303Z
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 21548, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 1
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 21548
api.js:31 [API] POST /api/pronunciation/check  word_id: 1 blob size: 21548 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(6)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 36038, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 1
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 36038
api.js:31 [API] POST /api/pronunciation/check  word_id: 1 blob size: 36038 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(3)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 36038, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 1
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 36038
api.js:31 [API] POST /api/pronunciation/check  word_id: 1 blob size: 36038 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(3)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 56324, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 2
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 56324
api.js:31 [API] POST /api/pronunciation/check  word_id: 2 blob size: 56324 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(5), suggestions: Array(5)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 53426, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 2
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 53426
api.js:31 [API] POST /api/pronunciation/check  word_id: 2 blob size: 53426 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(4)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 42800, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 3
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 42800
api.js:31 [API] POST /api/pronunciation/check  word_id: 3 blob size: 42800 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0.1, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(3)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 36038, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 4
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 36038
api.js:31 [API] POST /api/pronunciation/check  word_id: 4 blob size: 36038 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 4, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(5), suggestions: Array(4)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 37004, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 4
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 37004
api.js:31 [API] POST /api/pronunciation/check  word_id: 4 blob size: 37004 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0.1, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(4)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 37004, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 4
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 37004
api.js:31 [API] POST /api/pronunciation/check  word_id: 4 blob size: 37004 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0.5, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(5)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 40868, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 5
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 40868
api.js:31 [API] POST /api/pronunciation/check  word_id: 5 blob size: 40868 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 0.2, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(6), suggestions: Array(3)}

iam@Liams_PC MSYS /c/src/KV-JasmeetFork/speakingbuddy/backend (sanity-checks)
$ python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
INFO:     Will watch for changes in these directories: ['C:\\src\\KV-JasmeetFork\\speakingbuddy\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [23908] using WatchFiles
INFO:     Started server process [3652]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     127.0.0.1:57783 - "GET /js/api.js HTTP/1.1" 304 Not Modified
INFO:     127.0.0.1:50524 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:50524 - "GET /api/categories HTTP/1.1" 200 OK
INFO:     127.0.0.1:50524 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:57783 - "GET /topic.js HTTP/1.1" 200 OK
INFO:     127.0.0.1:57783 - "GET /api/categories/animals/words?lang=en HTTP/1.1" 200 OK
INFO:     127.0.0.1:57783 - "GET /api/audio/1 HTTP/1.1" 206 Partial Content
INFO:     127.0.0.1:57783 - "GET /favicon.ico HTTP/1.1" 404 Not Found
Pronunciation request: word_id=1, upload_filename=recording.webm, upload_bytes=21548, preprocess_mode=full
INFO:     127.0.0.1:62579 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
Pronunciation request: word_id=1, upload_filename=recording.webm, upload_bytes=36038, preprocess_mode=full
INFO:     127.0.0.1:63418 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
Pronunciation request: word_id=1, upload_filename=recording.webm, upload_bytes=36038, preprocess_mode=full
INFO:     127.0.0.1:63418 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:53262 - "GET /api/audio/2 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=2, upload_filename=recording.webm, upload_bytes=56324, preprocess_mode=full
INFO:     127.0.0.1:63283 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
Pronunciation request: word_id=2, upload_filename=recording.webm, upload_bytes=53426, preprocess_mode=full
INFO:     127.0.0.1:63957 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:51043 - "GET /api/audio/3 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=3, upload_filename=recording.webm, upload_bytes=42800, preprocess_mode=full
INFO:     127.0.0.1:55841 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:62493 - "GET /api/audio/4 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=4, upload_filename=recording.webm, upload_bytes=36038, preprocess_mode=full
INFO:     127.0.0.1:57350 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
Pronunciation request: word_id=4, upload_filename=recording.webm, upload_bytes=37004, preprocess_mode=full
INFO:     127.0.0.1:53707 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
Pronunciation request: word_id=4, upload_filename=recording.webm, upload_bytes=37004, preprocess_mode=full
INFO:     127.0.0.1:54692 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:54692 - "GET /api/audio/5 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=5, upload_filename=recording.webm, upload_bytes=40868, preprocess_mode=full
INFO:     127.0.0.1:64990 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [3652]
INFO:     Stopping reloader process [23908]
(.venv) 


## Experiment C (user says word+plural, preprocess=convert-only)

- Words tested: 5 (animals; 6 attempts logged)
- Avg score: 42.2
- Min score: 28.8
- Max score: 52.8
- Observations:
	- Scores improved materially versus Experiment B.
	- Improvement appears stable across all tested words.

logs: [INIT] page loaded at 2026-03-06T23:56:10.464Z
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 34106, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 1
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 34106
api.js:31 [API] POST /api/pronunciation/check  word_id: 1 blob size: 34106 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 36.7, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(3), suggestions: Array(4)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 59222, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 2
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 59222
api.js:31 [API] POST /api/pronunciation/check  word_id: 2 blob size: 59222 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 52.8, feedback: 'Your pronunciation needs improvement in several areas.', breakdown: {…}, improvements: Array(3), suggestions: Array(3)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 39902, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 3
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 39902
api.js:31 [API] POST /api/pronunciation/check  word_id: 3 blob size: 39902 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 44.5, feedback: 'Your pronunciation needs improvement in several areas.', breakdown: {…}, improvements: Array(3), suggestions: Array(3)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 35072, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 4
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 35072
api.js:31 [API] POST /api/pronunciation/check  word_id: 4 blob size: 35072 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 28.8, feedback: 'Keep practising! Focus on the suggestions below.', breakdown: {…}, improvements: Array(4), suggestions: Array(5)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 35072, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 4
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 35072
api.js:31 [API] POST /api/pronunciation/check  word_id: 4 blob size: 35072 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 43, feedback: 'Your pronunciation needs improvement in several areas.', breakdown: {…}, improvements: Array(3), suggestions: Array(4)}
topic.js:287 [Evaluate] clicked, recordedBlob: Blob {size: 40868, type: 'audio/webm'} WORDS.length: 5
topic.js:298 [Evaluate] Sending word_id: 5
topic.js:320 [Evaluate] Audio source: recorded filename: recording.webm size: 40868
api.js:31 [API] POST /api/pronunciation/check  word_id: 5 blob size: 40868 filename: recording.webm
api.js:38 [API] Response status: 200
topic.js:323 [Evaluate] Result: {score: 47.5, feedback: 'Your pronunciation needs improvement in several areas.', breakdown: {…}, improvements: Array(3), suggestions: Array(3)}

liam@Liams_PC MSYS /c/src/KV-JasmeetFork/speakingbuddy/backend (sanity-checks)
$ python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
INFO:     Will watch for changes in these directories: ['C:\\src\\KV-JasmeetFork\\speakingbuddy\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [18628] using WatchFiles
INFO:     Started server process [11548]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     127.0.0.1:63210 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:63210 - "GET /api/categories HTTP/1.1" 200 OK
INFO:     127.0.0.1:63210 - "GET /index.html HTTP/1.1" 304 Not Modified
INFO:     127.0.0.1:63210 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:63210 - "GET /api/categories HTTP/1.1" 200 OK
INFO:     127.0.0.1:63210 - "GET /index.html HTTP/1.1" 304 Not Modified
INFO:     127.0.0.1:63210 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:63210 - "GET /api/categories HTTP/1.1" 200 OK
INFO:     127.0.0.1:63210 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:49449 - "GET /topic.js HTTP/1.1" 304 Not Modified
INFO:     127.0.0.1:49449 - "GET /api/categories/animals/words?lang=en HTTP/1.1" 200 OK
INFO:     127.0.0.1:49449 - "GET /api/audio/1 HTTP/1.1" 206 Partial Content
INFO:     127.0.0.1:49449 - "GET /favicon.ico HTTP/1.1" 404 Not Found
Pronunciation request: word_id=1, upload_filename=recording.webm, upload_bytes=34106, preprocess_mode=convert-only
INFO:     127.0.0.1:63639 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:61524 - "GET /api/audio/2 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=2, upload_filename=recording.webm, upload_bytes=59222, preprocess_mode=convert-only
INFO:     127.0.0.1:52243 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:54325 - "GET /api/audio/3 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=3, upload_filename=recording.webm, upload_bytes=39902, preprocess_mode=convert-only
INFO:     127.0.0.1:50988 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:49973 - "GET /api/audio/4 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=4, upload_filename=recording.webm, upload_bytes=35072, preprocess_mode=convert-only
INFO:     127.0.0.1:50559 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
Pronunciation request: word_id=4, upload_filename=recording.webm, upload_bytes=35072, preprocess_mode=convert-only
INFO:     127.0.0.1:59570 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     127.0.0.1:49987 - "GET /api/audio/5 HTTP/1.1" 206 Partial Content
Pronunciation request: word_id=5, upload_filename=recording.webm, upload_bytes=40868, preprocess_mode=convert-only
INFO:     127.0.0.1:55215 - "POST /api/pronunciation/check HTTP/1.1" 200 OK
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [11548]
INFO:     Stopping reloader process [18628]

## Sample Logs

Frontend lines:

Backend lines:

## Interpretation

- Hypothesis supported:
	- Yes. Upload preprocessing is a major source of mismatch when references contain multi-word utterances (word + plural).
- Likely root cause:
	- `full` upload preprocessing (trim/split-first-word/cap) alters uploaded audio structure while reference features are computed from unsplit raw references.
- Next action:
	- Quantified delta (B -> C): +41.7 points in average score (0.49 -> 42.2), about 86x higher.
	- Issue identified clearly: asymmetric preprocessing between reference and upload paths is the primary failure mode.
	- Recommendation 1: for raw multi-word references, keep `UPLOAD_PREPROCESS_MODE=convert-only` as the default test/benchmark mode.
	- Recommendation 2: implement a symmetric preprocessing strategy and apply it to both reference features and uploads (same trim/split policy on both sides).
	- Recommendation 3: add an explicit backend experiment switch for comparison target (`first-segment` vs `full-utterance`) and rerun B/C on a larger word set.
