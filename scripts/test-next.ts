import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const repo = await realpath(resolve(import.meta.dir, ".."));
const checkout = createHash("sha256").update(repo).digest("hex").slice(0, 12);
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const coreIndex = args.indexOf("--core");
const core = coreIndex >= 0 ? args[coreIndex + 1] : undefined;
const aliasIndex = args.indexOf("--alias");
const alias = aliasIndex >= 0 ? args[aliasIndex + 1] : "@";
if (alias !== "@" && alias !== "~")
  throw new Error("Supported fixture aliases: @ or ~");
if (coreIndex >= 0 && !core)
  throw new Error("--core requires a local Surface core package directory");
const sandbox = join(
  homedir(),
  ".cache",
  "surface-shadcn",
  `${checkout}${core || alias !== "@" ? "-mechanics" : ""}`,
);
const app = join(sandbox, "next-app");
const owner = join(sandbox, ".surface-owner");

async function exists(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function run(command: string[], cwd = repo) {
  console.log(`\n> ${command.join(" ")}`);
  const child = Bun.spawn(command, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${command[0]} exited with status ${code}`);
}

async function clean() {
  const directory = await exists(sandbox);
  if (!directory) {
    console.log(`Already clean: ${sandbox}`);
    return;
  }
  const marker = await exists(owner);
  if (
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    !marker?.isFile() ||
    marker.isSymbolicLink() ||
    (await readFile(owner, "utf8")) !== `${repo}\n`
  ) {
    throw new Error(`Refusing to remove an unowned sandbox: ${sandbox}`);
  }
  await rm(sandbox, { recursive: true });
  console.log(
    `Removed managed Next app and local package artifacts: ${sandbox}`,
  );
}

async function verify() {
  await run(
    [
      "bun",
      "add",
      "--dev",
      "@happy-dom/global-registrator@^20",
      "@testing-library/react@^16",
      "@testing-library/user-event@^14",
      "@types/bun@^1.4",
    ],
    app,
  );
  await mkdir(join(app, "tests"), { recursive: true });
  await copyFile(
    join(repo, "scripts/test-dom.ts"),
    join(app, "tests/setup.ts"),
  );
  const tests = (
    await readFile(join(repo, "src/rendered-mechanics.test.tsx"), "utf8")
  )
    .replace('"../registry/surface/kit"', '"../src/components/surface/kit"')
    .replace('"./schemas"', '"@rusl-labs/surface-shadcn"');
  await writeFile(join(app, "tests/mechanics.test.tsx"), tests);
  await run(
    [
      "bun",
      "test",
      "--preload",
      "./tests/setup.ts",
      "./tests/mechanics.test.tsx",
    ],
    app,
  );
  await run(["bun", "run", "build"], app);
}

async function setup() {
  if (await exists(sandbox)) {
    throw new Error(
      `Sandbox already exists: ${sandbox}\nStop its dev server, then run bun run test:next:clean before rebuilding.`,
    );
  }
  await mkdir(resolve(sandbox, ".."), { recursive: true });
  await mkdir(sandbox);
  await writeFile(owner, `${repo}\n`, { flag: "wx" });

  await run(["bun", "run", "build"]);
  await run(["bun", "run", "build:registry"]);
  const tarball = join(sandbox, "surface-shadcn.tgz");
  await run(["bun", "pm", "pack", "--filename", tarball, "--ignore-scripts"]);

  // Only the unpublished package address changes; installed source is untouched.
  const manifest = await Bun.file(join(repo, "public/r/surface.json")).json();
  const pkg = await Bun.file(join(repo, "package.json")).json();
  const dependency = `${pkg.name}@${pkg.version}`;
  if (!manifest.dependencies.includes(dependency)) {
    throw new Error(
      `Registry is missing its expected dependency: ${dependency}`,
    );
  }
  manifest.dependencies = manifest.dependencies.map((name: string) =>
    name === dependency ? `file:${tarball}` : name,
  );
  if (core) {
    const corePackage = resolve(core);
    await run(["bun", "run", "build"], corePackage);
    const coreTarball = join(sandbox, "surface-core.tgz");
    await run(
      ["bun", "pm", "pack", "--filename", coreTarball, "--ignore-scripts"],
      corePackage,
    );
    manifest.dependencies = manifest.dependencies.map((name: string) =>
      name.startsWith("@rusl-labs/surface@") ? `file:${coreTarball}` : name,
    );
  }
  const registry = join(sandbox, "surface.json");
  await writeFile(registry, `${JSON.stringify(manifest, null, 2)}\n`);

  await run(
    [
      "bunx",
      "create-next-app@16.3.4",
      app,
      "--ts",
      "--tailwind",
      "--eslint",
      "--app",
      "--src-dir",
      "--import-alias",
      `${alias}/*`,
      "--use-bun",
      "--disable-git",
      "--yes",
    ],
    sandbox,
  );
  // Let shadcn own font setup instead of mixing two generators' font tokens.
  await copyFile(
    join(repo, "scripts/next/layout.tsx"),
    join(app, "src/app/layout.tsx"),
  );
  const shadcn = ["bunx", "--bun", "shadcn@4.21.0"];
  await run(
    [
      ...shadcn,
      "init",
      "--base",
      "base",
      "--preset",
      "nova",
      "--no-monorepo",
      "--yes",
    ],
    app,
  );
  await run([...shadcn, "add", registry, "--yes"], app);

  // Only consumer content is supplied here. All Surface files come from shadcn.
  await writeFile(
    join(app, "src/app/page.tsx"),
    (await readFile(join(repo, "scripts/next/page.tsx"), "utf8")).replaceAll(
      '"@/',
      `"${alias}/`,
    ),
  );
  await copyFile(
    join(repo, "example/src/contact.schema.json"),
    join(app, "src/app/contact.schema.json"),
  );
  await copyFile(
    join(repo, "example/src/contact.annotation.json"),
    join(app, "src/app/contact.annotation.json"),
  );
  const resolversPath = join(app, "src/components/surface/resolvers.ts");
  await writeFile(
    resolversPath,
    `import {
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type AnnotationDocument,
} from "@rusl-labs/surface";
import { shadcnSchemas } from "@rusl-labs/surface-shadcn";
import contactAnnotation from "../../app/contact.annotation.json";

// Supported canonical documents resolve offline. Add your own local schemas here.
export const schemaResolver = new InMemorySchemaFetchResolver(shadcnSchemas);

// Register annotations explicitly; schema URLs do not imply annotation URLs.
export const annotationResolver = new InMemoryAnnotationResolver({
  [contactAnnotation.subject]: contactAnnotation as AnnotationDocument,
});
`,
  );
  if (core) await verify();
  else await run(["bun", "run", "build"], app);
  console.log(
    `\nReady: ${app}\n\nStart the app:\n  bun --cwd ${JSON.stringify(app)} run dev\n\nWhen finished, stop its dev server, then repeat this command with clean:\n  bun run test:next ${core ? `--core ${JSON.stringify(core)} ` : ""}--alias ${JSON.stringify(alias)} clean\n\nThe sandbox includes the local tarball; keep it until you clean the app.`,
  );
}

try {
  if (args.length === 0 || coreIndex >= 0 || aliasIndex >= 0) {
    if (args.includes("clean")) await clean();
    else if (args.includes("verify")) await verify();
    else await setup();
  } else if (args.length === 1 && args[0] === "clean") await clean();
  else if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log(
      `bun run test:next        Create and build one isolated Next.js + Base UI/Nova app.\nbun run test:next --core ../schema-driven-ui/packages/core --alias '~'\n                        Verify a local core tarball and nondefault aliases in a separate mechanics sandbox.\n                        Append verify to rerun installed regressions and the production build.\nbun run test:next:clean  Remove only this checkout's owned sandbox (repeat --core/--alias to clean mechanics).\n\nSandbox: ${sandbox}\nRequires Bun, Node.js, and internet access for dependencies.\nNo git repository, background server, or workspace link is created.\nExisting sandboxes are never overwritten. Stop the app before cleaning.`,
    );
  } else
    throw new Error(
      "Usage: bun run test:next [--core <package-directory>] [--alias @|~] [verify | clean | --help]",
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
