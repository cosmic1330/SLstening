import Database from "@tauri-apps/plugin-sql";
const db = await Database.load("sqlite:schoice.db");

const SChoice = () => {
  return (
    <div>
      <h1>Stock Choice</h1>
    </div>
  );
};
export default SChoice;
