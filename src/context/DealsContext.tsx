import { createContext } from "react";
import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";

export const DealsContext = createContext<StockListType>([]);
