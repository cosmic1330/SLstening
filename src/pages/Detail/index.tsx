import { Outlet, useParams } from "react-router";

function Detail() {
  const { id } = useParams();
  return (
    <main>
      <div>{id}</div>
      <Outlet />
    </main>
  );
}
export default Detail;
