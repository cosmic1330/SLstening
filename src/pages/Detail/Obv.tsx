import useStockListStore from "../../store/stockList";

export default function Obv() {
  const { deals } = useStockListStore(); 

  return (
    <main>
      <div>Obv Page</div>
      <pre>{JSON.stringify(deals, null, 2)}</pre>
    </main>
  );
}
