---
name: ArchSim
order: 4
status: live
category: distributed systems simulator
tagline: "Crash-test your architecture before your users do."
summary: "A flight simulator for distributed systems. Draw your stack with real technologies, throw traffic and failures at it, and get a straight yes or no, with the bottleneck, the breaking point and the monthly bill."
repo: dante0747/archsim
accent: "#3D9BFF"
accent2: "#BF5AF2"
logo: assets/images/projects/archsim-logo.svg
image: assets/images/projects/archsim-cover.jpg
stack: [Java 25, Spring Boot, TypeScript, Next.js, PostgreSQL, Discrete-event simulation]
stats:
  - { value: "25", label: "templates" }
  - { value: "40", label: "technologies" }
  - { value: "9", label: "measured experiments" }
tags: [archsim]
---

## Why it exists

Architecture decisions are usually made on a whiteboard and tested in production. ArchSim puts a
simulator in between: draw the system you plan to build, with the technologies you actually run,
and find out how it behaves under load and failures before you build it.

- **Real technologies, real behaviour.** PostgreSQL locks rows and waits for its write-ahead log,
  its replicas lag, Redis forks for snapshots, JVMs pause for garbage collection, Lambda starts
  cold and Kubernetes pods wait for a node. Each behaviour links to the vendor's documentation.
- **Every request, every second.** A discrete-event engine moves each request through every hop,
  queue, lock and retry, then replays the run second by second on your diagram. The same design
  and seed always give the same result.
- **A straight answer.** Yes or no against your latency and availability objectives, the
  bottleneck, what to fix first, the highest load that still holds, and the monthly cost on real
  AWS instance types.

## Highlights

- **Four workspaces, one canvas:** Design, Test, Results and a Grafana-style Dashboard, with 25
  ready-made templates from a cache-aside starter to Kafka pipelines and serverless bursts.
- **Chaos on demand.** Ramp the traffic, drop a cache or slow a database, and watch the verdict
  change within seconds.
- **Honest about accuracy.** Every default says whether it is documented or illustrative,
  calibration from Prometheus or OpenTelemetry replaces them with measured values, and the
  accuracy report publishes predictions against real systems, misses included.
- **Beyond the canvas.** A CLI and a GitHub Action gate pull requests on your objectives, an MCP
  server lets AI agents drive it, and designs import from docker-compose, Kubernetes or Terraform.

## Under the hood

The engine is a deterministic discrete-event simulator written in Java 25, with a Spring Boot API,
workers sharing a run queue in PostgreSQL, and a Next.js and React Flow editor. The web app, the
API, the CLI and the MCP server share one engine, so a design gives the same result digest
everywhere. It started as a Python engine and was ported to Java figure for figure, about 14
times faster.

## Try it

With Docker installed, clone the repository and run `docker compose up`, then open
`http://localhost:3000`. No account and no telemetry.

## Get involved

ArchSim is open source under the AGPL-3.0, with a commercial license for companies that embed or
host it. [Report a bug](https://github.com/dante0747/archsim/issues/new/choose), ask a question in
[Discussions](https://github.com/dante0747/archsim/discussions), or read
[CONTRIBUTING.md](https://github.com/dante0747/archsim/blob/main/CONTRIBUTING.md) to help.
