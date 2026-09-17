Noto Sans static fonts from https://github.com/notofonts/noto-fonts/tree/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans

Distributed under the accompanying SIL Open Font License. Files are unmodified.

SHA-256:
- `NotoSans-Regular.ttf`: `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`
- `NotoSans-Bold.ttf`: `c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a`
- `OFL.txt`: `0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb`

Coverage in `../pdf-font-coverage.ts` is the intersection of these two fonts’ Unicode cmap keys, generated from PDFKit’s installed fontkit `characterSet` arrays. Update it when changing either font.

Regenerate coverage from the installed PDFKit dependency with `node scripts/generate-pdf-font-coverage.mjs` at the repository root. The Dashboard build copies this directory beside the built renderer; no fonts are fetched at runtime.
