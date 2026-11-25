# Cairo font files

Place the Cairo font family (SIL Open Font License) in this folder with exactly these file names:

- `Cairo_400Regular.ttf`
- `Cairo_600SemiBold.ttf`
- `Cairo_700Bold.ttf`
- `Cairo_800ExtraBold.ttf`

Download them from Google Fonts: search "Cairo" at https://fonts.google.com/specimen/Cairo
and use the static TTF files. They are bundled into the app at build time, so the app
works fully offline afterwards.

These files are intentionally not committed (binary assets). The app will not bundle
until they exist.
