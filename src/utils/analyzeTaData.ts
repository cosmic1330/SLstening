import { TaType } from "../types";

export default function analyzeTaData(taData: string):TaType {
  const ta_index = taData.indexOf('"ta":');
  if (ta_index === -1) {
    throw new Error("getTaFetch: Invalid response format");
  }
  const json_ta = "{" + taData.slice(ta_index).replace(");", "");
  const parse = JSON.parse(json_ta);
  const ta = parse.ta;
  return ta;
}
