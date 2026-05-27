import { z } from "zod";
import { districtSchema } from "../geo/district";
import { regionSchema } from "../geo/region";

export const regionsResponseSchema = z.array(regionSchema);
export type RegionsResponse = z.infer<typeof regionsResponseSchema>;

export const districtsResponseSchema = z.array(districtSchema);
export type DistrictsResponse = z.infer<typeof districtsResponseSchema>;
