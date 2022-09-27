import { TimeEffect } from "../../../deps.ts";
import { ParamsReader } from "../../shared-types/session_inputs_type.ts";
import { MemoryConstantsReader } from "../types/memory.ts";

export type CoreEffects =
	& TimeEffect<{ hoursFromEpoch: number }>
	& ParamsReader
	& MemoryConstantsReader;
