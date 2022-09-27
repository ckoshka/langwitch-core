import { use } from "../../deps.ts";
import { Database } from "../database.ts";
import { ParamsReader } from "../session_inputs_type.ts";

export const findGraduated =
	(db: Database) => (currConcepts: Set<string> | Array<string>) =>
		use<ParamsReader>().map2((f) =>
			Array.from(currConcepts).filter((cid) => {
				const c = db.concepts[cid];
				return c.decayCurve > f.params.knownThreshold; //?????
			})
		);
// PROBLEM: FOR NEWLY INTRODUCED WORDS, IT ONLY SHOWS THEM AFTER MEMORY DECAYS
