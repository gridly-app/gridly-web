import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parse } from "postcss";
import ts from "typescript";

type Reference = {
	line: number;
	paths: string[] | undefined;
	glob?: boolean;
	reexport?: boolean;
};
type Violation = {
	source: string;
	owner: string;
	target: string;
	targetOwner?: string;
	line: number;
	rule: string;
};

const testFile = /\.(test|spec)\.[cm]?[jt]sx?$/;
const moduleIndex = /^(index\.[cm]?[jt]sx?)$/;
const sourceLayers = new Set(["app", "domain", "ports", "shared"]);
const pureShared = "src/shared/invariants/";
const sourceFile = /\.(?:[cm]?[jt]sx?|css)$/;
const extensions = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".css",
	".json",
];

function scriptReferences(file: string, contents: string): Reference[] {
	const script = ts.createSourceFile(
		file,
		contents,
		ts.ScriptTarget.Latest,
		true,
	);
	const references: Reference[] = [];

	function record(node: ts.Node, argument: ts.Node | undefined, glob = false) {
		const location = script.getLineAndCharacterOfPosition(
			node.getStart(script),
		);
		const args =
			glob && argument && ts.isArrayLiteralExpression(argument)
				? argument.elements
				: [argument];
		const paths = args.map((entry) =>
			entry && ts.isStringLiteralLike(entry) ? entry.text : undefined,
		);

		references.push({
			line: location.line + 1,
			paths: paths.every((path) => path !== undefined) ? paths : undefined,
			glob,
			reexport: ts.isExportDeclaration(node),
		});
	}

	function visit(node: ts.Node) {
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			if (node.moduleSpecifier) record(node, node.moduleSpecifier);
		}

		if (ts.isExternalModuleReference(node)) record(node, node.expression);

		if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
			record(node, node.argument.literal);
		}

		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			const name = callee.getText(script);

			if (
				callee.kind === ts.SyntaxKind.ImportKeyword ||
				name === "require" ||
				name === "mock.module"
			) {
				record(node, node.arguments[0]);
			}

			if (name === "import.meta.glob") record(node, node.arguments[0], true);
		}

		ts.forEachChild(node, visit);
	}

	visit(script);

	return references;
}

function cssReferences(contents: string): Reference[] {
	const references: Reference[] = [];
	const css = parse(contents);

	css.walkAtRules("import", (rule) => {
		const match = /^(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s)]+))/.exec(
			rule.params,
		);
		const path = match?.[1] ?? match?.[2] ?? match?.[3];

		if (path)
			references.push({ line: rule.source?.start?.line ?? 1, paths: [path] });
	});
	css.walkDecls(/^(composes|compose-with)$/, (declaration) => {
		const match = /\bfrom\s+(?:"([^"]+)"|'([^']+)')/.exec(declaration.value);
		const path = match?.[1] ?? match?.[2];

		if (path)
			references.push({
				line: declaration.source?.start?.line ?? 1,
				paths: [path],
			});
	});

	return references;
}

type ResolvePath = (from: string, specifier: string) => string | undefined;

function projectPaths(root: string): ResolvePath {
	const configFile = join(root, "tsconfig.app.json");
	const config = existsSync(configFile)
		? ts.readConfigFile(configFile, ts.sys.readFile)
		: undefined;
	const compilerOptions = ts.convertCompilerOptionsFromJson(
		config?.config?.compilerOptions ?? {},
		root,
	).options;
	const aliases = Object.entries(compilerOptions.paths ?? {});
	const base = relative(root, compilerOptions.baseUrl ?? root);

	return (from, specifier) => {
		if (specifier.startsWith("//") || /^[a-z]+:/i.test(specifier))
			return undefined;
		if (specifier.startsWith("/")) return specifier.slice(1);
		if (specifier.startsWith("./") || specifier.startsWith("../"))
			return join(dirname(from), specifier);

		for (const [alias, targets] of aliases) {
			const [prefix = "", suffix = ""] = alias.split("*");
			const hasWildcard = alias.includes("*");
			const matches = hasWildcard
				? specifier.startsWith(prefix) &&
					specifier.endsWith(suffix) &&
					specifier.length >= prefix.length + suffix.length
				: specifier === alias;

			if (!matches) continue;

			const captured = specifier.slice(
				prefix.length,
				specifier.length - suffix.length,
			);
			const candidates = targets.map((target) =>
				join(base, target.replace("*", captured)),
			);
			const existing = candidates.find(
				(candidate) => resolveTarget(root, candidate) !== undefined,
			);

			return existing ?? candidates[0];
		}

		if (from.endsWith(".css") && !specifier.startsWith("#"))
			return join(dirname(from), specifier);
	};
}

function expandGlob(
	from: string,
	patterns: string[],
	files: string[],
	projectPath: ResolvePath,
): string[] | undefined {
	const includes: Bun.Glob[] = [];
	const excludes: Bun.Glob[] = [];

	for (const pattern of patterns) {
		const isExcluded = pattern.startsWith("!");
		const path = projectPath(from, isExcluded ? pattern.slice(1) : pattern);
		if (!path || path.startsWith("../")) return undefined;

		const globs = isExcluded ? excludes : includes;
		globs.push(new Bun.Glob(path));
	}

	return files.filter(
		(file) =>
			includes.some((glob) => glob.match(file)) &&
			!excludes.some((glob) => glob.match(file)),
	);
}

function layer(file: string): string | undefined {
	return /^src\/([^/]+)\//.exec(file)?.[1];
}

function owner(file: string, modules: Set<string>): string {
	const layerName = layer(file);

	if (layerName !== "app") return dirname(file);

	let directory = dirname(file);

	while (directory !== "src/app" && !modules.has(directory)) {
		directory = dirname(directory);
	}

	return directory;
}

function isAssembly(source: string, sourceOwner: string): boolean {
	if (testFile.test(source) || /\.compose\.[cm]?[jt]sx?$/.test(source))
		return true;
	if (dirname(source) !== sourceOwner) return false;
	if (moduleIndex.test(basename(source))) return true;

	const component = basename(sourceOwner)
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

	return basename(source) === `${component}.tsx`;
}

function boundary(
	source: string,
	target: string,
	sourceOwner: string,
	targetOwner: string,
	parentOwner: string,
	reexport: boolean,
): string | undefined {
	const isTest = source.startsWith("tests/") || testFile.test(source);
	const from = layer(source);
	const to = layer(target);
	const isPublic = moduleIndex.test(basename(target));

	if (target.startsWith("tests/") || testFile.test(target)) {
		return isTest ? undefined : "product-cannot-import-tests";
	}
	if (
		source.startsWith("tests/support/") &&
		(to === "app" || ((to === "domain" || to === "ports") && !isPublic))
	) {
		return "support-uses-ports-and-domain";
	}

	if (
		from === "domain" &&
		to !== "domain" &&
		target !== `${pureShared}index.ts`
	)
		return "domain-must-be-pure";
	if (source.startsWith(pureShared) && !target.startsWith(pureShared))
		return "domain-must-be-pure";
	if (from === "shared" && to !== "shared")
		return "shared-cannot-import-product";

	if (from === "ports") {
		if (to === "domain" || to === "shared")
			return isPublic ? undefined : "public-entry-required";

		if (to !== "ports") return "ports-cannot-import-implementations";
	}

	if (source === "src/main.tsx")
		return target === "src/app/index.ts" ? undefined : "main-uses-app-entry";
	if (from === "app" && to === "app") {
		if (sourceOwner === targetOwner) return undefined;
		if (parentOwner !== sourceOwner) return "direct-child-only";
		if (!isPublic) return "public-entry-required";
		if (!isAssembly(source, sourceOwner)) return "assembly-only";
		if (reexport && moduleIndex.test(basename(source)))
			return "child-entry-cannot-be-reexported";

		return undefined;
	}

	if (from === "app") {
		if (to === "domain" || to === "ports" || to === "shared") {
			return isPublic ? undefined : "public-entry-required";
		}

		return "app-imports-app-domain-ports-shared";
	}
}

function checkTarget(
	root: string,
	modules: Set<string>,
	source: string,
	specifier: string,
	reference: Reference,
	projectPath: ResolvePath,
): Violation | undefined {
	const sourceOwner = owner(source, modules);
	const { line, glob, reexport = false } = reference;
	const unqualified = specifier.replace(/(?<=.)[?#].*$/, "");
	const path = glob ? specifier : projectPath(source, unqualified);

	if (!path) {
		const from = layer(source);
		const isReact = specifier === "react" || specifier.startsWith("react/");
		const details = { source, owner: sourceOwner, target: specifier, line };

		if (source === "src/main.tsx")
			return { ...details, rule: "main-uses-app-entry" };
		if (testFile.test(source) && specifier === "bun:test") return undefined;
		if (
			(from === "domain" && specifier !== "zod") ||
			source.startsWith(pureShared)
		)
			return { ...details, rule: "domain-must-be-pure" };
		if (from === "ports" && !isReact)
			return { ...details, rule: "ports-cannot-import-implementations" };

		return undefined;
	}

	const target = resolveTarget(root, path) ?? path;
	const targetOwner = owner(target, modules);
	const parentOwner =
		targetOwner === "src/app" ? "src" : owner(targetOwner, modules);
	const rule = boundary(
		source,
		target,
		sourceOwner,
		targetOwner,
		parentOwner,
		reexport,
	);

	if (rule)
		return { source, owner: sourceOwner, target, targetOwner, line, rule };
}

export function inspectArchitecture(root: string): Violation[] {
	const projectPath = projectPaths(root);
	const files = [
		...new Bun.Glob("{src,tests}/**/*").scanSync({ cwd: root }),
	].sort();
	const modules = new Set(
		files.filter((file) => moduleIndex.test(basename(file))).map(dirname),
	);
	const violations: Violation[] = [];

	for (const source of files.filter((file) => sourceFile.test(file))) {
		const layerName = layer(source);
		if (layerName && !sourceLayers.has(layerName)) {
			violations.push({
				source,
				owner: dirname(source),
				target: layerName,
				line: 1,
				rule: "unknown-source-layer",
			});
		}

		const contents = readFileSync(join(root, source), "utf8");
		const references = source.endsWith(".css")
			? cssReferences(contents)
			: scriptReferences(source, contents);

		for (const reference of references) {
			const { paths, line, glob } = reference;
			const targets =
				paths && (glob ? expandGlob(source, paths, files, projectPath) : paths);

			if (!targets) {
				violations.push({
					source,
					owner: owner(source, modules),
					target: "<dynamic>",
					line,
					rule: "static-target-required",
				});
				continue;
			}

			const failures = targets.map((target) =>
				checkTarget(root, modules, source, target, reference, projectPath),
			);
			violations.push(...failures.filter((failure) => failure !== undefined));
		}
	}

	return violations;
}

function resolveTarget(root: string, path: string): string | undefined {
	const absolute = resolve(root, path);
	const withoutOutputExtension = absolute.replace(/\.[cm]?jsx?$/, "");
	const candidates = [
		absolute,
		...extensions.map((ext) => withoutOutputExtension + ext),
		...extensions.map((ext) => join(absolute, `index${ext}`)),
	];
	const target = candidates.find(
		(candidate) => existsSync(candidate) && statSync(candidate).isFile(),
	);

	return target ? relative(root, target) : undefined;
}

if (import.meta.main) {
	const root = resolve(import.meta.dir, "..");
	const violations = inspectArchitecture(root);

	for (const violation of violations) {
		const target = violation.targetOwner
			? `${violation.target} (${violation.targetOwner})`
			: violation.target;
		console.error(
			`${violation.source}:${violation.line} (${violation.owner}) -> ${target}: ${violation.rule}`,
		);
	}

	if (violations.length) process.exitCode = 1;
}
