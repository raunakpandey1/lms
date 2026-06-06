import { Link } from "react-router-dom";

export function Unauthorized() {
  return (
    <section className="page">
      <h1>Unauthorized</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/">Go home</Link>
    </section>
  );
}