import { use } from "../../deps.ts";
import { CoreEffects } from "../core/effects/mod.ts";
import { predict } from "../core/memory.ts";
import { Concept } from "../core/types/concept.ts";
import { Database } from "../shared_types/database.ts";

const sortConcepts = (concepts: Array<Concept>) =>
	use<CoreEffects>().map2(
		async (f) => {
			const known: string[] = [];
			const learning: string[] = [];
			await Promise.all(
				concepts.map(async (c) =>
					(await predict(f.now().hoursFromEpoch)(c).run(f)) > 0.3 &&
						c.timesSeen > 2 //! sacrifices purity and also parameterisation
						? known.push(c.name)
						: learning.push(c.name)
				),
			);
			return [known, learning];
		},
	);

export const refresh = (db: Database) =>
	sortConcepts(Object.values(db.concepts)).map(([known, learning]) => ({
		db,
		known,
		learning,
		queue: [],
		stats: {
			learnCount: 0,
			knownCount: known.length,
		},
		desiredHideLevel: 0,
		lastResponse: "",
		noMoreLearnablesLeft: false,
	}));
