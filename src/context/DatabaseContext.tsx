import { createContext } from "react";
import Database from "@tauri-apps/plugin-sql";

type DbContextType = {
  db: Database | null;
};

export const DatabaseContext = createContext<DbContextType>({ db: null });
