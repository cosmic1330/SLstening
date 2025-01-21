import { DatabaseContext } from "../../context/DatabaseContext";
import useDatabase from "../../hooks/useDatabase";
import LatestDate from "./parts/LatestDate";

const Schoice = () => {
  const db = useDatabase();

  return (
    <DatabaseContext.Provider value={{ db }}>
      <LatestDate />
    </DatabaseContext.Provider>
  );
};
export default Schoice;
