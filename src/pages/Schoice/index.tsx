import { DatabaseContext } from "../../context/DatabaseContext";
import useDatabase from "../../hooks/useDatabase";

const Schoice = () => {
  const db = useDatabase();
  return (
    <DatabaseContext.Provider value={{ db }}>
      <h1>Stock Choice</h1>
    </DatabaseContext.Provider>
  );
};
export default Schoice;
