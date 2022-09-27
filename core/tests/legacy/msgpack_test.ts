import { fileToLines } from "../external/preproc/iterators_v2.ts";
import { toLangDB } from "../external/preproc/processors/lang.ts";
import { tokenize } from "../external/preproc/processors/shared.ts";
import { Hasher } from "../internal/db/internal_types.ts";
import { pack, Rmd } from "../pure_deps.ts";

const hasher = Hasher();
const tkn = tokenize({ granularity: "word", filterIsWordLike: true });

const pseudohasher = (() => {
	let count = 0;
	const seen: Record<string, number> = {};
	return (item: string) => {
		if (seen[item] !== undefined) {
			//
		} else {
			count += 1;
			seen[item] = count;
		}
		return seen[item];
	};
})();

toLangDB.map((fn) =>
	fileToLines(
		`/Users/ckoshka/programming/rust-experiments/langwitch_scripts/augment/minified_shuffled/bulgarian`,
	).then(fn)
)
	.map((db) =>
		Object.values(db.contexts).map((c) => c().concepts.map(pseudohasher))
	)
	.map(pack)
	.map((data) => Deno.writeFile("bulgarian.msgpack", data))
	.map(() => console.log("Done"))
	.run({
		tokenise: tkn,
	});
