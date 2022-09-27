import * as C from "./concept.ts";
import { Database } from "../database.ts";
import { Free } from "../../deps.ts";

export const getUpdatedConcepts =
	(db: Database) => (scores: [string, number][]) =>
		Free.flatten(
			scores.filter(([literal, _]) => db.concepts[literal]).map(
				([literal, score]) => {
					const concept: C.Concept = db.concepts[literal];
					if (concept === undefined) {
						throw new Error(
							"One of the concepts marked was not found in the database.",
						);
					}
					return C.mark(concept)(score);
				},
			),
		);
