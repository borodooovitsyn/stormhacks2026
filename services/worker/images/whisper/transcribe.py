"""Container entry: transcribe the first audio file in /input to /output."""

import glob
import json
import os

from faster_whisper import WhisperModel

IN, OUT = "/input", "/output"


def main() -> None:
    audio = sorted(glob.glob(os.path.join(IN, "*")))
    if not audio:
        raise SystemExit("no input audio in /input")

    model_path = os.environ.get("WHISPER_MODEL", "/models/tiny")
    device = os.environ.get("WHISPER_DEVICE", "cpu")
    compute = os.environ.get("WHISPER_COMPUTE", "int8")

    model = WhisperModel(model_path, device=device, compute_type=compute)
    segments, info = model.transcribe(audio[0])
    text = " ".join(s.text.strip() for s in segments).strip()

    with open(os.path.join(OUT, "transcript.txt"), "w") as f:
        f.write(text + "\n")
    with open(os.path.join(OUT, "transcript.json"), "w") as f:
        json.dump({"text": text, "language": info.language}, f)
    print(f"transcribed ({info.language}): {text}")


if __name__ == "__main__":
    main()
