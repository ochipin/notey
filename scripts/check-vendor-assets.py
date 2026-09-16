#!/usr/bin/env python3
"""Check offline vendor integrity, module closure, font URLs, and license records."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

THEME = Path(__file__).resolve().parents[1]
VENDOR = THEME / 'static' / 'vendor'


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def main() -> None:
    manifests = sorted(VENDOR.glob('*/*/VENDOR-MANIFEST.json'))
    require(bool(manifests), 'No vendor manifests found')
    total = 0
    for manifest_path in manifests:
        root = manifest_path.parent
        manifest = read_json(manifest_path)
        files = manifest['files']
        actual = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
        require(actual == set(files) | {'VENDOR-MANIFEST.json'}, f'File inventory mismatch: {root}')
        for name, expected in files.items():
            path = root / name
            require(path.resolve().is_relative_to(root.resolve()), f'Path escapes vendor root: {name}')
            data = path.read_bytes()
            require(len(data) == expected['bytes'], f'File size mismatch: {path}')
            require(hashlib.sha256(data).hexdigest() == expected['sha256'], f'SHA-256 mismatch: {path}')
        provenance = read_json(root / 'PROVENANCE.json')
        if manifest['name'] == 'mermaid':
            modules = set(root.rglob('*.mjs'))
            visited = set()
            queue = [root / 'mermaid.esm.min.mjs']
            while queue:
                module = queue.pop().resolve()
                if module in visited:
                    continue
                visited.add(module)
                # All imports in the pinned official ESM build use string literals.
                imports = re.findall(r'(?:from\s*|import\s*(?:\(\s*)?)[\"\'](\.[^\"\']+\.mjs)[\"\']', module.read_text())
                for specifier in imports:
                    target = (module.parent / specifier).resolve()
                    require(target.is_relative_to(root.resolve()) and target.is_file(), f'Missing module: {module}: {specifier}')
                    queue.append(target)
            require(visited == {m.resolve() for m in modules}, 'Mermaid module inventory differs from import closure')
            for package in provenance['npmPackages']:
                require(package['license'] and package['sha256'] and package['integrity'], f'Incomplete package provenance: {package["name"]}')
                require(bool(package['licenseFiles']), f'No package license: {package["name"]}')
                for name in package['licenseFiles']:
                    require((root / name).is_file(), f'Missing license: {name}')
            for component in provenance['elkCompiledLibraries']:
                require(component['sourceURL'].endswith('-sources.jar'), 'ELK dependency has no source archive URL')
                require((root / component['noticeFile']).is_file(), f'Missing ELK dependency notice: {component["name"]}')
            require((root / 'LICENSES/EPL-1.0.txt').is_file() and (root / 'LICENSES/EPL-2.0.md').is_file(), 'Missing Eclipse license texts')
            print(f'Mermaid: {len(modules)} modules, {len(provenance["npmPackages"])} npm license records, {len(provenance["elkCompiledLibraries"])} compiled-library source records')
        elif manifest['name'] == 'katex':
            css = (root / 'katex.min.css').read_text()
            urls = re.findall(r'url\([\"\']?([^\)\"\']+)[\"\']?\)', css)
            require(bool(urls), 'KaTeX CSS contains no font URLs')
            for url in urls:
                target = (root / url).resolve()
                require(target.is_relative_to(root.resolve()) and target.is_file(), f'Missing/locality violation in font URL: {url}')
            fonts = {p.resolve() for p in (root / 'fonts').iterdir() if p.is_file()}
            require(fonts == {(root / url).resolve() for url in urls}, 'Font inventory differs from CSS URL references')
            require(provenance['fontsLicense'] == 'OFL-1.1', 'Unexpected KaTeX font license')
            require('SIL OPEN FONT LICENSE' in (root / 'OFL-1.1.txt').read_text(), 'Missing OFL text')
            notices = (root / 'FONT-NOTICES.txt').read_text()
            for path in (root / 'fonts').glob('*.ttf'):
                require(path.name in notices, f'Missing font copyright notice: {path.name}')
            print(f'KaTeX: stylesheet and {len(fonts)} fonts, MIT and OFL notices')
        total += sum(f['bytes'] for f in files.values())
    print(f'Vendor integrity OK ({len(manifests)} distributions, {total:,} bytes, excluding manifests)')


if __name__ == '__main__':
    main()
