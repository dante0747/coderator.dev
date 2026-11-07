---
name: SpecLift
order: 3
status: live
category: Swagger → OpenAPI converter
tagline: "Swagger's conversion rules, minus Swagger's bugs."
summary: "Convert Swagger 2.0 specs to OpenAPI 3 entirely in your browser. Your API spec never leaves your machine, and the output stays valid where Swagger's converter breaks."
url: https://speclift.coderator.dev/
urlLabel: open converter
repo: dante0747/spec-lift
accent: "#FF7A55"
logo: assets/images/projects/speclift-logo.svg
image: assets/images/projects/speclift-cover.jpg
stack: [TypeScript, React, Next.js, Tailwind CSS, Vite]
stats:
  - { value: "99/99", label: "APIs match Swagger" }
  - { value: "0", label: "uploads" }
  - { value: "2", label: "modes" }
tags: [speclift, openapi]
---

## Why it exists

API specs often describe internal systems that shouldn't be uploaded to a third-party service.
Swagger's online converter sends your spec to its server. SpecLift runs the same conversion
entirely in your browser, and fixes the places where Swagger's output is invalid or loses data.

|                                     | SpecLift | converter.swagger.io |
|-------------------------------------|:--------:|:--------------------:|
| Spec stays on your machine          |    ✅    |          ❌          |
| Same conversion rules as Swagger    |    ✅    |          ✅          |
| Valid OpenAPI 3 when Swagger's isn't |    ✅    |          ❌          |
| Works offline, no account, no tracking |  ✅    |          ❌          |

## Highlights

- **Two modes.** *Fix Swagger bugs* (the default) keeps Swagger's rules and fixes its known bugs.
  *Swagger-exact* reproduces converter.swagger.io byte for byte, key order included.
- **JSON and YAML, in and out.** Paste, open or drop files up to 10 MB. YAML is read with the
  same YAML 1.1 rules Swagger uses.
- **A real editor.** Syntax highlighting, line numbers, error markers and live conversion as you
  type.
- **Private by design.** No backend, uploads, accounts, analytics, telemetry or third-party
  scripts.

## Under the hood

The converter is a TypeScript port of Swagger's own converter (swagger-parser and swagger-core)
written as a pure function with no network access. Swagger-exact mode is tested against
converter.swagger.io: **99 real-world APIs from APIs.guru**, from 1 KB to 1 MB, came out
identical.

## Get involved

[Report a bug](https://github.com/dante0747/spec-lift/issues/new?template=bug_report.yml) or
[request a feature](https://github.com/dante0747/spec-lift/issues/new?template=feature_request.yml).
The project is MIT licensed.
