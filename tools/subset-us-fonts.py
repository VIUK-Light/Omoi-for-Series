"""Rebuild the bundled OFL fonts from verified upstream TTFs.

Usage: python tools/subset-us-fonts.py /directory/containing/upstream/fonts
Build-only dependencies: fonttools[woff], brotli. No font service is used at runtime.
"""
from pathlib import Path
import hashlib
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = {
    "Regular": "258d7156c165f2ff774b6efee637c22c3b950de0d8a10e501137061bc8085d01",
    "Bold": "30eba52fc837e8b62c97d4b82e6706583149fb7294e3712dd71a655eaea80a90",
}


def main():
    source = Path(sys.argv[1])
    destination = ROOT / "us/fonts"
    destination.mkdir(exist_ok=True)
    files = [ROOT / "shared/questions/us.json", ROOT / "howto.html"]
    files += list((ROOT / "us").glob("*.html")) + list((ROOT / "us").glob("*.js"))
    for series in ["family", "friends"]:
        files += list((ROOT / series).glob("*.html"))
    text = "".join(file.read_text() for file in files)
    for start, end in [(0x20, 0x7E), (0x3000, 0x30FF), (0xFF00, 0xFFEF)]:
        text += "".join(chr(value) for value in range(start, end + 1))
    for weight, expected in UPSTREAM.items():
        path = source / f"BIZUDPGothic-{weight}.ttf"
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Upstream fingerprint mismatch: {path.name}")
        font = TTFont(path, recalcTimestamp=False)
        options = subset.Options()
        options.name_IDs = ["*"]
        options.name_legacy = True
        options.layout_features = ["*"]
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(text=text)
        subsetter.subset(font)
        # Rename the modified font while retaining copyright and license names.
        names = {1: "Omoi Us UI", 2: weight, 3: f"OmoiUsUI-{weight}",
                 4: f"Omoi Us UI {weight}", 6: f"OmoiUsUI-{weight}",
                 16: "Omoi Us UI", 17: weight}
        for record in list(font["name"].names):
            if record.nameID in names:
                font["name"].setName(names[record.nameID], record.nameID,
                                     record.platformID, record.platEncID, record.langID)
        font.flavor = "woff2"
        output = destination / f"omoi-us-ui-{weight.lower()}.woff2"
        font.save(output)
        print(f"{output.relative_to(ROOT)}: {output.stat().st_size:,} bytes")
    license_text = (source / "OFL.txt").read_text()
    (destination / "OFL.txt").write_text("\n".join(line.rstrip() for line in license_text.splitlines()) + "\n")


if __name__ == "__main__":
    main()
