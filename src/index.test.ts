import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

describe("Worker", () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev("src/index.ts", {
			experimental: { disableExperimentalWarning: true },
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it("should return Hello World", async () => {
		const resp = await worker.fetch("/?name=mesa", { headers: { "Accept": "application/json" } });
		if (resp) {
			const json = await resp.json();
			expect(json).toMatchInlineSnapshot(`
				[
				  {
				    "arch": "x86_64",
				    "base": "mesa",
				    "builddate": "1680963731",
				    "conflicts": "mesa-libgl",
				    "csize": "29742286",
				    "depends": [
				      "libdrm",
				      "wayland",
				      "libxxf86vm",
				      "libxdamage",
				      "libxshmfence",
				      "libelf",
				      "libomxil-bellagio",
				      "libunwind",
				      "llvm-libs",
				      "lm_sensors",
				      "libglvnd",
				      "zstd",
				      "vulkan-icd-loader",
				      "libsensors.so=5-64",
				      "libexpat.so=1-64",
				    ],
				    "desc": "An open-source implementation of the OpenGL specification",
				    "filename": "mesa-23.0.2-2-x86_64.pkg.tar.zst",
				    "isize": "89452246",
				    "license": "custom",
				    "makedepends": [
				      "python-mako",
				      "libxml2",
				      "libx11",
				      "xorgproto",
				      "libdrm",
				      "libxshmfence",
				      "libxxf86vm",
				      "libxdamage",
				      "libvdpau",
				      "libva",
				      "wayland",
				      "wayland-protocols",
				      "zstd",
				      "elfutils",
				      "llvm",
				      "libomxil-bellagio",
				      "libclc",
				      "clang",
				      "libglvnd",
				      "libunwind",
				      "lm_sensors",
				      "libxrandr",
				      "systemd",
				      "valgrind",
				      "glslang",
				      "vulkan-icd-loader",
				      "directx-headers",
				      "cmake",
				      "meson",
				      "rust",
				      "rust-bindgen",
				      "spirv-tools",
				      "spirv-llvm-translator",
				    ],
				    "md5sum": "ffc9f402ca45103ab68cf0dc102330ac",
				    "meta": {
				      "html_url": "https://github.com/manjaro-contrib/trace-mirror-dbs/blob/767d22e2181a8473e32214269e1bd77742f93449/repo/stable/extra/x86_64/mesa-23.0.2-2.json",
				      "sha": "630dfe19defb05dfc4268b67653364b9aad55604",
				    },
				    "name": "mesa",
				    "optdepends": [
				      "mesa-vdpau: for accelerated video playback",
				      "opengl-man-pages: for the OpenGL API man pages",
				      "libva-mesa-driver: for accelerated video playback",
				    ],
				    "packager": "Mark Wagie <mark@manjaro.org>",
				    "pgpsig": "iQEzBAABCAAdFiEEaI6PgoedDiXOVBQmFQwgB0PtRtgFAmQxenkACgkQFQwgB0PtRtjeoAf9GobdX5qduneWP3ATSrjTk5ypYc8YAqHp/KLEdCjMuR5a4zEfZz9RrnquKLkt639u+o869wGPkHhaXndmXDU68CrZ1dCgv7MLBuNKWiSyUkfAJ12qdHiEjLKMwED+1dV0nmHuKnqQNmYPLd6/Yfr5pjjgOYGPOfCz4AHWForvblgOZbauTZF5lx2kY6NQxu9xBDMdE5DC2RW+/qh8C0Gzn9DDS/A/gKdZs5Qpw36fDAY40kBAt7bCb+ojXaNKkcIhY9PhloNEfWZHtvNs4IbRt5S7/NIwi/HmjGoD6d9A9iHJEHFgmSHVVA1pL6KGEdLICQkedm/M4vZ66H0MJf0KWA==",
				    "provides": [
				      "mesa-libgl",
				      "opengl-driver",
				    ],
				    "replaces": "mesa-libgl",
				    "sha256sum": "eeea04534a6813ac4a94d647a36a595f62edc32626175d8cf956f7c92069c93e",
				    "tokens": [
				      "mesa",
				      "mesa_x86_64",
				      "mesa_stable",
				      "mesa_x86_64_stable",
				    ],
				    "url": "https://www.mesa3d.org/",
				    "version": "23.0.2-2",
				  },
				]
			`);
		}
	});
});
