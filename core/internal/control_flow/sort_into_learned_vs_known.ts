import { Concept, CoreEffects, use } from "../../deps.ts";
import { markNew } from "../core/mark_concepts.ts";

export const updateLearnedAndKnown = (
	learnedBefore: Iterable<string>,
	knownBefore: Iterable<string>,
	graduatedIds: Array<string>,
) => {
	const learning = new Set(learnedBefore);
	const known = new Set(knownBefore);
	graduatedIds.forEach((i) => {
		learning.delete(i);
		known.add(i);
	});
	return { learning, known };
};

export const updateDbWithNew =
	(rec: Record<string, Concept>) => (learning: Iterable<string>) =>
		use<CoreEffects>().map2((f) =>
			Array.from(learning).map(async (id) =>
				rec[id] !== undefined ? rec[id] : await markNew({
					name: id,
				})
					.run(f)
			)
		).map((p) => Promise.all(p));
// unclear, needs revision